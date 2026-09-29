"""
Lost device workflow and incident management tests.
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
from app.models.enums import DeviceStatus, DeviceType, IncidentStatus, IncidentType, UserRole
from app.models.gate import Gate
from app.models.gate_assignment import GateAssignment
from app.models.incident import Incident
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
# Helpers
# ---------------------------------------------------------------------------

def _user(db, suffix: str, role: UserRole = UserRole.STUDENT, active: bool = True) -> User:
    u = User(
        full_name=f"User {suffix}",
        email=f"lost_{suffix}@test.com",
        password_hash=hash_password("pass"),
        role=role,
        is_active=active,
    )
    db.add(u)
    db.flush()
    db.refresh(u)
    return u


def _device(db, owner: User, suffix: str, status: DeviceStatus = DeviceStatus.INSIDE_CAMPUS) -> Device:
    d = Device(
        asset_id=f"CG-DEV-L{suffix}",
        serial_number=f"SN-L{suffix}",
        device_type=DeviceType.LAPTOP,
        owner_id=owner.id,
        status=status,
        qr_code_value=f"CG-DEV-LQ{suffix}",
    )
    db.add(d)
    db.flush()
    db.refresh(d)
    return d


def _gate(db, suffix: str) -> Gate:
    g = Gate(name=f"Gate {suffix}", code=f"LG-{suffix}")
    db.add(g)
    db.flush()
    db.refresh(g)
    return g


def _assignment(db, officer: User, gate: Gate) -> GateAssignment:
    now = datetime.now(timezone.utc)
    a = GateAssignment(
        officer_id=officer.id,
        gate_id=gate.id,
        is_active=True,
        start_time=now - timedelta(minutes=30),
        end_time=now + timedelta(hours=8),
    )
    db.add(a)
    db.flush()
    db.refresh(a)
    return a


def _token(user: User) -> dict:
    t = create_access_token(user.id, user.role.value)
    return {"Authorization": f"Bearer {t}"}


def _report_lost(db, device: Device, actor: User, description: str = "Lost my laptop") -> dict:
    resp = client.post(
        f"/api/v1/devices/{device.id}/report-lost",
        json={"description": description},
        headers=_token(actor),
    )
    return resp


# ---------------------------------------------------------------------------
# REPORTING
# ---------------------------------------------------------------------------

def test_owner_can_report_lost(db):
    owner = _user(db, "rl_own")
    device = _device(db, owner, "RL01")
    resp = _report_lost(db, device, owner)
    assert resp.status_code == 201
    data = resp.json()
    assert data["incident_type"] == "LOST_DEVICE"
    assert data["status"] == "OPEN"
    assert data["device_id"] == str(device.id)
    assert data["reported_by"] == str(owner.id)


def test_owner_cannot_report_other_users_device(db):
    owner = _user(db, "rl_own2")
    other = _user(db, "rl_other2")
    device = _device(db, owner, "RL02")
    resp = _report_lost(db, device, other)
    assert resp.status_code == 403


def test_admin_can_report_any_device_lost(db):
    admin = _user(db, "rl_adm", role=UserRole.ADMIN)
    owner = _user(db, "rl_adm_own")
    device = _device(db, owner, "RL03")
    resp = _report_lost(db, device, admin)
    assert resp.status_code == 201


def test_gate_officer_cannot_report_lost(db):
    officer = _user(db, "rl_off", role=UserRole.GATE_OFFICER)
    owner = _user(db, "rl_off_own")
    device = _device(db, owner, "RL04")
    resp = _report_lost(db, device, officer)
    assert resp.status_code == 403


def test_already_lost_cannot_report_again(db):
    owner = _user(db, "rl_dup")
    device = _device(db, owner, "RL05", status=DeviceStatus.REPORTED_LOST)
    resp = _report_lost(db, device, owner)
    assert resp.status_code == 409


def test_already_lost_status_cannot_report_again(db):
    owner = _user(db, "rl_dup2")
    device = _device(db, owner, "RL06", status=DeviceStatus.LOST)
    resp = _report_lost(db, device, owner)
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# INCIDENT CREATION
# ---------------------------------------------------------------------------

def test_lost_incident_created(db):
    owner = _user(db, "inc_cr")
    device = _device(db, owner, "INC01")
    _report_lost(db, device, owner)
    incident = db.query(Incident).filter(Incident.device_id == device.id).first()
    assert incident is not None


def test_incident_correct_device(db):
    owner = _user(db, "inc_dev")
    device = _device(db, owner, "INC02")
    resp = _report_lost(db, device, owner)
    assert resp.json()["device_id"] == str(device.id)


def test_incident_correct_reporter(db):
    owner = _user(db, "inc_rep")
    device = _device(db, owner, "INC03")
    resp = _report_lost(db, device, owner)
    assert resp.json()["reported_by"] == str(owner.id)


def test_incident_correct_type(db):
    owner = _user(db, "inc_typ")
    device = _device(db, owner, "INC04")
    resp = _report_lost(db, device, owner)
    assert resp.json()["incident_type"] == IncidentType.LOST_DEVICE.value


def test_incident_initial_status_open(db):
    owner = _user(db, "inc_st")
    device = _device(db, owner, "INC05")
    resp = _report_lost(db, device, owner)
    assert resp.json()["status"] == IncidentStatus.OPEN.value


def test_report_lost_audit_log_created(db):
    owner = _user(db, "inc_aud")
    device = _device(db, owner, "INC06")
    _report_lost(db, device, owner)
    log = db.query(AuditLog).filter(
        AuditLog.actor_id == owner.id,
        AuditLog.action == "DEVICE_REPORTED_LOST",
        AuditLog.entity_id == str(device.id),
    ).first()
    assert log is not None


def test_device_status_changes_to_reported_lost(db):
    owner = _user(db, "inc_stat")
    device = _device(db, owner, "INC07")
    _report_lost(db, device, owner)
    db.refresh(device)
    assert device.status == DeviceStatus.REPORTED_LOST


# ---------------------------------------------------------------------------
# MOVEMENT PROTECTION (lost device)
# ---------------------------------------------------------------------------

def test_lost_device_cannot_check_out(db):
    officer = _user(db, "mp_co_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "mp_co")
    _assignment(db, officer, gate)
    owner = _user(db, "mp_co_own")
    device = _device(db, owner, "MP01", status=DeviceStatus.LOST)

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_token(officer))
    assert resp.status_code == 422


def test_lost_device_cannot_check_in(db):
    officer = _user(db, "mp_ci_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "mp_ci")
    _assignment(db, officer, gate)
    owner = _user(db, "mp_ci_own")
    device = _device(db, owner, "MP02", status=DeviceStatus.LOST)

    resp = client.post(f"/api/v1/devices/{device.id}/check-in", headers=_token(officer))
    assert resp.status_code == 422


def test_reported_lost_device_cannot_check_out(db):
    officer = _user(db, "mp_rco_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "mp_rco")
    _assignment(db, officer, gate)
    owner = _user(db, "mp_rco_own")
    device = _device(db, owner, "MP03", status=DeviceStatus.REPORTED_LOST)

    resp = client.post(f"/api/v1/devices/{device.id}/check-out", headers=_token(officer))
    assert resp.status_code == 422


def test_reported_lost_device_cannot_check_in(db):
    officer = _user(db, "mp_rci_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "mp_rci")
    _assignment(db, officer, gate)
    owner = _user(db, "mp_rci_own")
    device = _device(db, owner, "MP04", status=DeviceStatus.REPORTED_LOST)

    resp = client.post(f"/api/v1/devices/{device.id}/check-in", headers=_token(officer))
    assert resp.status_code == 422


def test_failed_movement_on_lost_no_movement_record(db):
    officer = _user(db, "mp_nomv_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "mp_nomv")
    _assignment(db, officer, gate)
    owner = _user(db, "mp_nomv_own")
    device = _device(db, owner, "MP05", status=DeviceStatus.LOST)

    client.post(f"/api/v1/devices/{device.id}/check-out", headers=_token(officer))
    count = db.query(DeviceMovement).filter(DeviceMovement.device_id == device.id).count()
    assert count == 0


# ---------------------------------------------------------------------------
# RECOVERY
# ---------------------------------------------------------------------------

def test_admin_can_recover_to_inside(db):
    admin = _user(db, "rec_adm", role=UserRole.ADMIN)
    owner = _user(db, "rec_own")
    device = _device(db, owner, "REC01", status=DeviceStatus.REPORTED_LOST)

    resp = client.post(
        f"/api/v1/devices/{device.id}/recover",
        json={"resulting_status": "INSIDE_CAMPUS"},
        headers=_token(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "INSIDE_CAMPUS"


def test_admin_can_recover_to_outside(db):
    admin = _user(db, "rec_out_adm", role=UserRole.ADMIN)
    owner = _user(db, "rec_out_own")
    device = _device(db, owner, "REC02", status=DeviceStatus.LOST)

    resp = client.post(
        f"/api/v1/devices/{device.id}/recover",
        json={"resulting_status": "OUTSIDE_CAMPUS"},
        headers=_token(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "OUTSIDE_CAMPUS"


def test_non_admin_cannot_recover(db):
    student = _user(db, "rec_nonadm")
    owner = _user(db, "rec_nonadm_own")
    device = _device(db, owner, "REC03", status=DeviceStatus.REPORTED_LOST)

    resp = client.post(
        f"/api/v1/devices/{device.id}/recover",
        json={"resulting_status": "INSIDE_CAMPUS"},
        headers=_token(student),
    )
    assert resp.status_code == 403


def test_officer_cannot_recover(db):
    officer = _user(db, "rec_off", role=UserRole.GATE_OFFICER)
    owner = _user(db, "rec_off_own")
    device = _device(db, owner, "REC04", status=DeviceStatus.REPORTED_LOST)

    resp = client.post(
        f"/api/v1/devices/{device.id}/recover",
        json={"resulting_status": "INSIDE_CAMPUS"},
        headers=_token(officer),
    )
    assert resp.status_code == 403


def test_recovery_requires_explicit_status(db):
    admin = _user(db, "rec_nostat", role=UserRole.ADMIN)
    owner = _user(db, "rec_nostat_own")
    device = _device(db, owner, "REC05", status=DeviceStatus.REPORTED_LOST)

    resp = client.post(
        f"/api/v1/devices/{device.id}/recover",
        json={},
        headers=_token(admin),
    )
    assert resp.status_code == 422


def test_recovery_rejects_invalid_resulting_status(db):
    admin = _user(db, "rec_badstat", role=UserRole.ADMIN)
    owner = _user(db, "rec_badstat_own")
    device = _device(db, owner, "REC06", status=DeviceStatus.REPORTED_LOST)

    resp = client.post(
        f"/api/v1/devices/{device.id}/recover",
        json={"resulting_status": "REPORTED_LOST"},
        headers=_token(admin),
    )
    assert resp.status_code == 422


def test_recovery_non_lost_device_rejected(db):
    admin = _user(db, "rec_notlost", role=UserRole.ADMIN)
    owner = _user(db, "rec_notlost_own")
    device = _device(db, owner, "REC07", status=DeviceStatus.INSIDE_CAMPUS)

    resp = client.post(
        f"/api/v1/devices/{device.id}/recover",
        json={"resulting_status": "INSIDE_CAMPUS"},
        headers=_token(admin),
    )
    assert resp.status_code == 409


def test_recovery_does_not_create_movement_record(db):
    admin = _user(db, "rec_nomv", role=UserRole.ADMIN)
    owner = _user(db, "rec_nomv_own")
    device = _device(db, owner, "REC08", status=DeviceStatus.REPORTED_LOST)

    client.post(
        f"/api/v1/devices/{device.id}/recover",
        json={"resulting_status": "INSIDE_CAMPUS"},
        headers=_token(admin),
    )
    count = db.query(DeviceMovement).filter(DeviceMovement.device_id == device.id).count()
    assert count == 0


def test_recovery_preserves_original_incident(db):
    admin = _user(db, "rec_inc", role=UserRole.ADMIN)
    owner = _user(db, "rec_inc_own")
    device = _device(db, owner, "REC09", status=DeviceStatus.INSIDE_CAMPUS)

    # Report lost first
    _report_lost(db, device, owner)
    db.refresh(device)

    incident_before = db.query(Incident).filter(Incident.device_id == device.id).first()
    assert incident_before is not None
    incident_id = incident_before.id

    # Recover
    client.post(
        f"/api/v1/devices/{device.id}/recover",
        json={"resulting_status": "INSIDE_CAMPUS"},
        headers=_token(admin),
    )

    incident_after = db.get(Incident, incident_id)
    assert incident_after is not None  # preserved
    assert incident_after.status == IncidentStatus.RESOLVED


def test_recovery_audit_log_created(db):
    admin = _user(db, "rec_aud", role=UserRole.ADMIN)
    owner = _user(db, "rec_aud_own")
    device = _device(db, owner, "REC10", status=DeviceStatus.REPORTED_LOST)

    client.post(
        f"/api/v1/devices/{device.id}/recover",
        json={"resulting_status": "INSIDE_CAMPUS"},
        headers=_token(admin),
    )
    log = db.query(AuditLog).filter(
        AuditLog.actor_id == admin.id,
        AuditLog.action == "DEVICE_RECOVERED",
        AuditLog.entity_id == str(device.id),
    ).first()
    assert log is not None


# ---------------------------------------------------------------------------
# INCIDENT STATUS TRANSITIONS
# ---------------------------------------------------------------------------

def _make_incident(db, device: Device, reporter: User) -> Incident:
    inc = Incident(
        device_id=device.id,
        reported_by=reporter.id,
        incident_type=IncidentType.LOST_DEVICE,
        description="Test incident",
        status=IncidentStatus.OPEN,
    )
    db.add(inc)
    db.flush()
    db.refresh(inc)
    return inc


def test_open_to_investigating(db):
    admin = _user(db, "tr_oi", role=UserRole.ADMIN)
    owner = _user(db, "tr_oi_own")
    device = _device(db, owner, "TR01")
    incident = _make_incident(db, device, owner)

    resp = client.patch(
        f"/api/v1/incidents/{incident.id}",
        json={"status": "INVESTIGATING"},
        headers=_token(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "INVESTIGATING"


def test_investigating_to_resolved(db):
    admin = _user(db, "tr_ir", role=UserRole.ADMIN)
    owner = _user(db, "tr_ir_own")
    device = _device(db, owner, "TR02")
    incident = _make_incident(db, device, owner)
    incident.status = IncidentStatus.INVESTIGATING
    db.flush()

    resp = client.patch(
        f"/api/v1/incidents/{incident.id}",
        json={"status": "RESOLVED"},
        headers=_token(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "RESOLVED"


def test_resolved_to_closed(db):
    admin = _user(db, "tr_rc", role=UserRole.ADMIN)
    owner = _user(db, "tr_rc_own")
    device = _device(db, owner, "TR03")
    incident = _make_incident(db, device, owner)
    incident.status = IncidentStatus.RESOLVED
    db.flush()

    resp = client.patch(
        f"/api/v1/incidents/{incident.id}",
        json={"status": "CLOSED"},
        headers=_token(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "CLOSED"


def test_invalid_transition_open_to_closed(db):
    admin = _user(db, "tr_bad1", role=UserRole.ADMIN)
    owner = _user(db, "tr_bad1_own")
    device = _device(db, owner, "TR04")
    incident = _make_incident(db, device, owner)

    resp = client.patch(
        f"/api/v1/incidents/{incident.id}",
        json={"status": "CLOSED"},
        headers=_token(admin),
    )
    assert resp.status_code == 422


def test_invalid_transition_open_to_resolved(db):
    admin = _user(db, "tr_bad2", role=UserRole.ADMIN)
    owner = _user(db, "tr_bad2_own")
    device = _device(db, owner, "TR05")
    incident = _make_incident(db, device, owner)

    resp = client.patch(
        f"/api/v1/incidents/{incident.id}",
        json={"status": "RESOLVED"},
        headers=_token(admin),
    )
    assert resp.status_code == 422


def test_closed_incident_cannot_reopen(db):
    admin = _user(db, "tr_cl", role=UserRole.ADMIN)
    owner = _user(db, "tr_cl_own")
    device = _device(db, owner, "TR06")
    incident = _make_incident(db, device, owner)
    incident.status = IncidentStatus.CLOSED
    db.flush()

    resp = client.patch(
        f"/api/v1/incidents/{incident.id}",
        json={"status": "OPEN"},
        headers=_token(admin),
    )
    assert resp.status_code == 422


def test_non_admin_cannot_patch_incident(db):
    student = _user(db, "tr_nonadm")
    owner = _user(db, "tr_nonadm_own")
    device = _device(db, owner, "TR07")
    incident = _make_incident(db, device, owner)

    resp = client.patch(
        f"/api/v1/incidents/{incident.id}",
        json={"status": "INVESTIGATING"},
        headers=_token(student),
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# TRANSACTION SAFETY
# ---------------------------------------------------------------------------

def test_failed_report_does_not_change_device_status(db):
    """Reporting another user's device must not change device status."""
    owner = _user(db, "tx_rl_own")
    other = _user(db, "tx_rl_other")
    device = _device(db, owner, "TX01")

    _report_lost(db, device, other)  # 403
    db.refresh(device)
    assert device.status == DeviceStatus.INSIDE_CAMPUS


def test_failed_report_does_not_create_incident(db):
    owner = _user(db, "tx_rl_inc_own")
    other = _user(db, "tx_rl_inc_other")
    device = _device(db, owner, "TX02")

    _report_lost(db, device, other)
    count = db.query(Incident).filter(Incident.device_id == device.id).count()
    assert count == 0


def test_failed_recovery_does_not_change_device_status(db):
    """Recovery on a non-lost device must not change status."""
    admin = _user(db, "tx_rec_adm", role=UserRole.ADMIN)
    owner = _user(db, "tx_rec_own")
    device = _device(db, owner, "TX03", status=DeviceStatus.INSIDE_CAMPUS)

    client.post(
        f"/api/v1/devices/{device.id}/recover",
        json={"resulting_status": "OUTSIDE_CAMPUS"},
        headers=_token(admin),
    )
    db.refresh(device)
    assert device.status == DeviceStatus.INSIDE_CAMPUS
