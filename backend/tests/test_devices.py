"""
Device enrollment and movement tests.
Requires PostgreSQL on port 5433. Skips automatically if unavailable.
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.db.session import get_db
from app.main import app
from app.models.audit_log import AuditLog
from app.models.device import Device
from app.models.device_movement import DeviceMovement
from app.models.enums import DeviceStatus, DeviceType, MovementType, UserRole
from app.models.gate import Gate
from app.models.gate_assignment import GateAssignment
from app.models.user import User

client = TestClient(app)


# ---------------------------------------------------------------------------
# DB fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def db_engine():
    try:
        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        yield engine
        engine.dispose()
    except Exception:
        pytest.skip("PostgreSQL not available")


@pytest.fixture()
def db(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()
    app.dependency_overrides[get_db] = lambda: session
    yield session
    app.dependency_overrides.clear()
    session.close()
    transaction.rollback()
    connection.close()


# ---------------------------------------------------------------------------
# Fixture helpers
# ---------------------------------------------------------------------------

def _user(db, suffix: str, role: UserRole = UserRole.STUDENT, active: bool = True) -> User:
    u = User(
        full_name=f"User {suffix}",
        email=f"dev_{suffix}@test.com",
        password_hash=hash_password("pass"),
        role=role,
        is_active=active,
    )
    db.add(u)
    db.flush()
    db.refresh(u)
    return u


def _gate(db, suffix: str) -> Gate:
    g = Gate(name=f"Gate {suffix}", code=f"GT-{suffix}")
    db.add(g)
    db.flush()
    db.refresh(g)
    return g


def _assignment(
    db,
    officer: User,
    gate: Gate,
    *,
    active: bool = True,
    start_offset_minutes: int = -30,
    end_offset_minutes: int | None = 480,
) -> GateAssignment:
    now = datetime.now(timezone.utc)
    a = GateAssignment(
        officer_id=officer.id,
        gate_id=gate.id,
        is_active=active,
        start_time=now + timedelta(minutes=start_offset_minutes),
        end_time=now + timedelta(minutes=end_offset_minutes) if end_offset_minutes is not None else None,
    )
    db.add(a)
    db.flush()
    db.refresh(a)
    return a


def _device(
    db,
    owner: User,
    suffix: str,
    status: DeviceStatus = DeviceStatus.INSIDE_CAMPUS,
) -> Device:
    d = Device(
        asset_id=f"CG-DEV-{suffix}",
        serial_number=f"SN-{suffix}",
        device_type=DeviceType.LAPTOP,
        owner_id=owner.id,
        status=status,
        qr_code_value=f"CG-DEV-QR{suffix}",
    )
    db.add(d)
    db.flush()
    db.refresh(d)
    return d


def _token(user: User) -> str:
    return create_access_token(user.id, user.role.value)


def _auth(user: User) -> dict:
    return {"Authorization": f"Bearer {_token(user)}"}


# ---------------------------------------------------------------------------
# DEVICE ENROLLMENT
# ---------------------------------------------------------------------------

def test_enroll_valid_student(db):
    student = _user(db, "enroll1")
    resp = client.post(
        "/api/v1/devices",
        json={"serial_number": "SN-ENROLL1", "device_type": "LAPTOP"},
        headers=_auth(student),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["serial_number"] == "SN-ENROLL1"
    assert data["status"] == "INSIDE_CAMPUS"
    assert data["asset_id"].startswith("CG-DEV-")
    assert data["qr_code_value"].startswith("CG-DEV-")
    assert "password" not in str(data)


def test_enroll_duplicate_serial_rejected(db):
    student = _user(db, "enroll_dup")
    _device(db, student, "DUPSER")
    resp = client.post(
        "/api/v1/devices",
        json={"serial_number": "SN-DUPSER", "device_type": "LAPTOP"},
        headers=_auth(student),
    )
    assert resp.status_code == 409


def test_enroll_admin_for_other_user(db):
    admin = _user(db, "enroll_adm", role=UserRole.ADMIN)
    owner = _user(db, "enroll_own")
    resp = client.post(
        "/api/v1/devices",
        json={"serial_number": "SN-ADMINENROLL", "device_type": "TABLET", "owner_id": str(owner.id)},
        headers=_auth(admin),
    )
    assert resp.status_code == 201
    assert resp.json()["owner_id"] == str(owner.id)


def test_enroll_invalid_owner_rejected(db):
    admin = _user(db, "enroll_badowner", role=UserRole.ADMIN)
    resp = client.post(
        "/api/v1/devices",
        json={"serial_number": "SN-BADOWNER", "device_type": "PHONE", "owner_id": str(uuid.uuid4())},
        headers=_auth(admin),
    )
    assert resp.status_code == 404


def test_enroll_inactive_owner_rejected(db):
    admin = _user(db, "enroll_inact_adm", role=UserRole.ADMIN)
    inactive = _user(db, "enroll_inact_own", active=False)
    resp = client.post(
        "/api/v1/devices",
        json={"serial_number": "SN-INACTOWNER", "device_type": "PHONE", "owner_id": str(inactive.id)},
        headers=_auth(admin),
    )
    assert resp.status_code == 422


def test_enroll_student_cannot_enroll_for_other(db):
    """Student supplies owner_id — it must be silently overridden to themselves."""
    student = _user(db, "enroll_self")
    other = _user(db, "enroll_other")
    resp = client.post(
        "/api/v1/devices",
        json={"serial_number": "SN-SELFONLY", "device_type": "LAPTOP", "owner_id": str(other.id)},
        headers=_auth(student),
    )
    assert resp.status_code == 201
    assert resp.json()["owner_id"] == str(student.id)


# ---------------------------------------------------------------------------
# GATE ASSIGNMENT
# ---------------------------------------------------------------------------

def test_assignment_valid(db):
    officer = _user(db, "asgn_ok", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "asgn_ok")
    _assignment(db, officer, gate)
    owner = _user(db, "asgn_own")
    device = _device(db, owner, "ASGNOK")

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))
    assert resp.status_code == 200


def test_assignment_no_assignment_rejected(db):
    officer = _user(db, "asgn_none", role=UserRole.GATE_OFFICER)
    owner = _user(db, "asgn_none_own")
    device = _device(db, owner, "ASGNNONE")

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))
    assert resp.status_code == 403


def test_assignment_inactive_rejected(db):
    officer = _user(db, "asgn_inact", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "asgn_inact")
    _assignment(db, officer, gate, active=False)
    owner = _user(db, "asgn_inact_own")
    device = _device(db, owner, "ASGNINACT")

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))
    assert resp.status_code == 403


def test_assignment_expired_rejected(db):
    officer = _user(db, "asgn_exp", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "asgn_exp")
    _assignment(db, officer, gate, start_offset_minutes=-120, end_offset_minutes=-60)
    owner = _user(db, "asgn_exp_own")
    device = _device(db, owner, "ASGNEXP")

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))
    assert resp.status_code == 403


def test_assignment_future_rejected(db):
    officer = _user(db, "asgn_fut", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "asgn_fut")
    _assignment(db, officer, gate, start_offset_minutes=60, end_offset_minutes=240)
    owner = _user(db, "asgn_fut_own")
    device = _device(db, owner, "ASGNFUT")

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))
    assert resp.status_code == 403


def test_assignment_overlapping_rejected(db):
    officer = _user(db, "asgn_ovlp", role=UserRole.GATE_OFFICER)
    gate1 = _gate(db, "asgn_ovlp1")
    gate2 = _gate(db, "asgn_ovlp2")
    _assignment(db, officer, gate1)
    _assignment(db, officer, gate2)
    owner = _user(db, "asgn_ovlp_own")
    device = _device(db, owner, "ASGNOVLP")

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# CHECK OUT
# ---------------------------------------------------------------------------

def test_checkout_valid(db):
    officer = _user(db, "co_ok", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "co_ok")
    _assignment(db, officer, gate)
    owner = _user(db, "co_own")
    device = _device(db, owner, "COOK")

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))
    assert resp.status_code == 200
    data = resp.json()
    assert data["movement_type"] == "CHECK_OUT"
    assert data["previous_status"] == "INSIDE_CAMPUS"
    assert data["new_status"] == "OUTSIDE_CAMPUS"
    assert data["officer"]["id"] == str(officer.id)
    assert data["gate"]["id"] == str(gate.id)
    assert "password" not in str(data)


def test_checkout_already_outside_rejected(db):
    officer = _user(db, "co_dup", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "co_dup")
    _assignment(db, officer, gate)
    owner = _user(db, "co_dup_own")
    device = _device(db, owner, "CODUP", status=DeviceStatus.OUTSIDE_CAMPUS)

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))
    assert resp.status_code == 422


def test_checkout_lost_rejected(db):
    officer = _user(db, "co_lost", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "co_lost")
    _assignment(db, officer, gate)
    owner = _user(db, "co_lost_own")
    device = _device(db, owner, "COLOST", status=DeviceStatus.LOST)

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))
    assert resp.status_code == 422


def test_checkout_reported_lost_rejected(db):
    officer = _user(db, "co_rlost", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "co_rlost")
    _assignment(db, officer, gate)
    owner = _user(db, "co_rlost_own")
    device = _device(db, owner, "CORLOST", status=DeviceStatus.REPORTED_LOST)

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))
    assert resp.status_code == 422


def test_checkout_non_officer_rejected(db):
    student = _user(db, "co_nooff")
    owner = _user(db, "co_nooff_own")
    device = _device(db, owner, "CONOOFF")

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(student))
    assert resp.status_code == 403


def test_checkout_no_assignment_rejected(db):
    officer = _user(db, "co_noasgn", role=UserRole.GATE_OFFICER)
    owner = _user(db, "co_noasgn_own")
    device = _device(db, owner, "CONOASGN")

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))
    assert resp.status_code == 403


def test_checkout_correct_officer_and_gate_recorded(db):
    officer = _user(db, "co_rec", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "co_rec")
    _assignment(db, officer, gate)
    owner = _user(db, "co_rec_own")
    device = _device(db, owner, "COREC")

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))
    assert resp.status_code == 200
    data = resp.json()
    assert data["officer"]["id"] == str(officer.id)
    assert data["gate"]["code"] == gate.code


def test_checkout_audit_log_created(db):
    officer = _user(db, "co_audit", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "co_audit")
    _assignment(db, officer, gate)
    owner = _user(db, "co_audit_own")
    device = _device(db, owner, "COAUDIT")

    client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))

    log = db.query(AuditLog).filter(
        AuditLog.actor_id == officer.id,
        AuditLog.action == "CHECK_OUT",
        AuditLog.entity_id == str(device.id),
    ).first()
    assert log is not None


# ---------------------------------------------------------------------------
# CHECK IN
# ---------------------------------------------------------------------------

def test_checkin_valid(db):
    officer = _user(db, "ci_ok", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "ci_ok")
    _assignment(db, officer, gate)
    owner = _user(db, "ci_own")
    device = _device(db, owner, "CIOK", status=DeviceStatus.OUTSIDE_CAMPUS)

    resp = client.post(f"/api/v1/devices/{device.id}/check-in", headers=_auth(officer))
    assert resp.status_code == 200
    data = resp.json()
    assert data["movement_type"] == "CHECK_IN"
    assert data["previous_status"] == "OUTSIDE_CAMPUS"
    assert data["new_status"] == "INSIDE_CAMPUS"
    assert data["officer"]["id"] == str(officer.id)
    assert data["gate"]["id"] == str(gate.id)


def test_checkin_already_inside_rejected(db):
    officer = _user(db, "ci_dup", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "ci_dup")
    _assignment(db, officer, gate)
    owner = _user(db, "ci_dup_own")
    device = _device(db, owner, "CIDUP", status=DeviceStatus.INSIDE_CAMPUS)

    resp = client.post(f"/api/v1/devices/{device.id}/check-in", headers=_auth(officer))
    assert resp.status_code == 422


def test_checkin_lost_rejected(db):
    officer = _user(db, "ci_lost", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "ci_lost")
    _assignment(db, officer, gate)
    owner = _user(db, "ci_lost_own")
    device = _device(db, owner, "CILOST", status=DeviceStatus.LOST)

    resp = client.post(f"/api/v1/devices/{device.id}/check-in", headers=_auth(officer))
    assert resp.status_code == 422


def test_checkin_reported_lost_rejected(db):
    officer = _user(db, "ci_rlost", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "ci_rlost")
    _assignment(db, officer, gate)
    owner = _user(db, "ci_rlost_own")
    device = _device(db, owner, "CIRLOST", status=DeviceStatus.REPORTED_LOST)

    resp = client.post(f"/api/v1/devices/{device.id}/check-in", headers=_auth(officer))
    assert resp.status_code == 422


def test_checkin_non_officer_rejected(db):
    student = _user(db, "ci_nooff")
    owner = _user(db, "ci_nooff_own")
    device = _device(db, owner, "CINOOFF", status=DeviceStatus.OUTSIDE_CAMPUS)

    resp = client.post(f"/api/v1/devices/{device.id}/check-in", headers=_auth(student))
    assert resp.status_code == 403


def test_checkin_no_assignment_rejected(db):
    officer = _user(db, "ci_noasgn", role=UserRole.GATE_OFFICER)
    owner = _user(db, "ci_noasgn_own")
    device = _device(db, owner, "CINOASGN", status=DeviceStatus.OUTSIDE_CAMPUS)

    resp = client.post(f"/api/v1/devices/{device.id}/check-in", headers=_auth(officer))
    assert resp.status_code == 403


def test_checkin_correct_officer_and_gate_recorded(db):
    officer = _user(db, "ci_rec", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "ci_rec")
    _assignment(db, officer, gate)
    owner = _user(db, "ci_rec_own")
    device = _device(db, owner, "CIREC", status=DeviceStatus.OUTSIDE_CAMPUS)

    resp = client.post(f"/api/v1/devices/{device.id}/check-in", headers=_auth(officer))
    assert resp.status_code == 200
    data = resp.json()
    assert data["officer"]["id"] == str(officer.id)
    assert data["gate"]["code"] == gate.code


def test_checkin_audit_log_created(db):
    officer = _user(db, "ci_audit", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "ci_audit")
    _assignment(db, officer, gate)
    owner = _user(db, "ci_audit_own")
    device = _device(db, owner, "CIAUDIT", status=DeviceStatus.OUTSIDE_CAMPUS)

    client.post(f"/api/v1/devices/{device.id}/check-in", headers=_auth(officer))

    log = db.query(AuditLog).filter(
        AuditLog.actor_id == officer.id,
        AuditLog.action == "CHECK_IN",
        AuditLog.entity_id == str(device.id),
    ).first()
    assert log is not None


# ---------------------------------------------------------------------------
# CROSS-GATE MOVEMENT
# ---------------------------------------------------------------------------

def test_cross_gate_movement(db):
    officer_a = _user(db, "cg_a", role=UserRole.GATE_OFFICER)
    officer_b = _user(db, "cg_b", role=UserRole.GATE_OFFICER)
    gate1 = _gate(db, "cg1")
    gate3 = _gate(db, "cg3")
    _assignment(db, officer_a, gate1)
    _assignment(db, officer_b, gate3)

    owner = _user(db, "cg_own")
    device = _device(db, owner, "CGDEV")

    # Check out at Gate 1
    resp_out = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer_a))
    assert resp_out.status_code == 200
    assert resp_out.json()["gate"]["code"] == gate1.code

    # Check in at Gate 3 (different gate, different officer)
    resp_in = client.post(f"/api/v1/devices/{device.id}/check-in", headers=_auth(officer_b))
    assert resp_in.status_code == 200
    assert resp_in.json()["gate"]["code"] == gate3.code
    assert resp_in.json()["new_status"] == "INSIDE_CAMPUS"

    # Both movements preserved
    movements = db.query(DeviceMovement).filter(DeviceMovement.device_id == device.id).all()
    assert len(movements) == 2
    types = {m.movement_type for m in movements}
    assert MovementType.CHECK_OUT in types
    assert MovementType.CHECK_IN in types

    # Final device status
    db.refresh(device)
    assert device.status == DeviceStatus.INSIDE_CAMPUS


# ---------------------------------------------------------------------------
# TRANSACTION SAFETY
# ---------------------------------------------------------------------------

def test_failed_movement_does_not_change_device_status(db):
    """Check-out on an already-outside device must not alter status."""
    officer = _user(db, "tx_co", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "tx_co")
    _assignment(db, officer, gate)
    owner = _user(db, "tx_co_own")
    device = _device(db, owner, "TXCO", status=DeviceStatus.OUTSIDE_CAMPUS)

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))
    assert resp.status_code == 422

    db.refresh(device)
    assert device.status == DeviceStatus.OUTSIDE_CAMPUS


def test_failed_movement_does_not_create_movement_record(db):
    officer = _user(db, "tx_mv", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "tx_mv")
    _assignment(db, officer, gate)
    owner = _user(db, "tx_mv_own")
    device = _device(db, owner, "TXMV", status=DeviceStatus.OUTSIDE_CAMPUS)

    client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))

    count = db.query(DeviceMovement).filter(DeviceMovement.device_id == device.id).count()
    assert count == 0


def test_failed_movement_does_not_create_audit_record(db):
    officer = _user(db, "tx_aud", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "tx_aud")
    _assignment(db, officer, gate)
    owner = _user(db, "tx_aud_own")
    device = _device(db, owner, "TXAUD", status=DeviceStatus.OUTSIDE_CAMPUS)

    client.post(f"/api/v1/devices/{device.id}/check-out", headers=_auth(officer))

    count = db.query(AuditLog).filter(
        AuditLog.entity_id == str(device.id),
        AuditLog.action == "CHECK_OUT",
    ).count()
    assert count == 0
