"""
Visitor management tests.
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
from app.models.enums import DeviceType, IdentificationType, UserRole, VisitStatus
from app.models.gate import Gate
from app.models.gate_assignment import GateAssignment
from app.models.user import User
from app.models.visit import Visit
from app.models.visitor import Visitor

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
        email=f"vis_{suffix}@test.com",
        password_hash=hash_password("pass"),
        role=role,
        is_active=active,
    )
    db.add(u)
    db.flush()
    db.refresh(u)
    return u


def _gate(db, suffix: str) -> Gate:
    g = Gate(name=f"Gate {suffix}", code=f"VG-{suffix}")
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


def _visit_payload(host_id: uuid.UUID, *, start_offset: int = 0, end_offset: int = 120) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "visitor": {
            "full_name": f"Visitor {uuid.uuid4().hex[:6]}",
            "identification_type": "NATIONAL_ID",
            "identification_number": f"ID-{uuid.uuid4().hex[:8]}",
        },
        "host_user_id": str(host_id),
        "expected_start_at": (now + timedelta(minutes=start_offset)).isoformat(),
        "expected_end_at": (now + timedelta(minutes=end_offset)).isoformat(),
    }


def _create_visit(db, actor: User, host: User, **kwargs) -> dict:
    payload = _visit_payload(host.id, **kwargs)
    resp = client.post("/api/v1/visits", json=payload, headers=_token(actor))
    return resp


def _make_approved_visit(db, actor: User, host: User, **kwargs) -> Visit:
    """Create a visit and approve it, returning the Visit ORM object."""
    resp = _create_visit(db, actor, host, **kwargs)
    assert resp.status_code == 201
    visit_id = resp.json()["id"]

    admin = _user(db, f"appadm_{uuid.uuid4().hex[:4]}", role=UserRole.ADMIN)
    client.post(f"/api/v1/visits/{visit_id}/approve", headers=_token(admin))

    visit = db.get(Visit, uuid.UUID(visit_id))
    db.refresh(visit)
    return visit


# ---------------------------------------------------------------------------
# VISITOR / VISIT CREATION
# ---------------------------------------------------------------------------

def test_student_can_create_visit(db):
    student = _user(db, "vc_st")
    host = _user(db, "vc_host")
    resp = _create_visit(db, student, host)
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "PENDING"
    assert data["qr_code_value"] is None  # QR only generated on approval


def test_staff_can_create_visit(db):
    staff = _user(db, "vc_sf", role=UserRole.STAFF)
    host = _user(db, "vc_sf_host")
    resp = _create_visit(db, staff, host)
    assert resp.status_code == 201


def test_admin_can_create_visit(db):
    admin = _user(db, "vc_adm", role=UserRole.ADMIN)
    host = _user(db, "vc_adm_host")
    resp = _create_visit(db, admin, host)
    assert resp.status_code == 201


def test_officer_cannot_create_visit(db):
    officer = _user(db, "vc_off", role=UserRole.GATE_OFFICER)
    host = _user(db, "vc_off_host")
    resp = _create_visit(db, officer, host)
    assert resp.status_code == 403


def test_invalid_host_rejected(db):
    student = _user(db, "vc_badhost")
    payload = _visit_payload(uuid.uuid4())  # non-existent host
    resp = client.post("/api/v1/visits", json=payload, headers=_token(student))
    assert resp.status_code == 404


def test_inactive_host_rejected(db):
    student = _user(db, "vc_inact")
    inactive_host = _user(db, "vc_inact_host", active=False)
    resp = _create_visit(db, student, inactive_host)
    assert resp.status_code == 422


def test_invalid_time_range_rejected(db):
    student = _user(db, "vc_time")
    host = _user(db, "vc_time_host")
    payload = _visit_payload(host.id, start_offset=120, end_offset=60)  # end before start
    resp = client.post("/api/v1/visits", json=payload, headers=_token(student))
    assert resp.status_code == 422


def test_same_end_as_start_rejected(db):
    student = _user(db, "vc_same")
    host = _user(db, "vc_same_host")
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "visitor": {
            "full_name": "Test",
            "identification_type": "PASSPORT",
            "identification_number": "PP-SAME",
        },
        "host_user_id": str(host.id),
        "expected_start_at": now,
        "expected_end_at": now,
    }
    resp = client.post("/api/v1/visits", json=payload, headers=_token(student))
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# APPROVAL
# ---------------------------------------------------------------------------

def test_admin_approves_pending_visit(db):
    admin = _user(db, "ap_adm", role=UserRole.ADMIN)
    student = _user(db, "ap_st")
    host = _user(db, "ap_host")
    resp = _create_visit(db, student, host)
    visit_id = resp.json()["id"]

    resp2 = client.post(f"/api/v1/visits/{visit_id}/approve", headers=_token(admin))
    assert resp2.status_code == 200
    data = resp2.json()
    assert data["status"] == "APPROVED"
    assert data["qr_code_value"] is not None
    assert data["qr_code_value"].startswith("CG-VISIT-")


def test_non_admin_cannot_approve(db):
    student = _user(db, "ap_nonadm")
    host = _user(db, "ap_nonadm_host")
    resp = _create_visit(db, student, host)
    visit_id = resp.json()["id"]

    resp2 = client.post(f"/api/v1/visits/{visit_id}/approve", headers=_token(student))
    assert resp2.status_code == 403


def test_cannot_approve_already_approved(db):
    admin = _user(db, "ap_dup", role=UserRole.ADMIN)
    student = _user(db, "ap_dup_st")
    host = _user(db, "ap_dup_host")
    resp = _create_visit(db, student, host)
    visit_id = resp.json()["id"]

    client.post(f"/api/v1/visits/{visit_id}/approve", headers=_token(admin))
    resp2 = client.post(f"/api/v1/visits/{visit_id}/approve", headers=_token(admin))
    assert resp2.status_code == 422


def test_admin_rejects_pending_visit(db):
    admin = _user(db, "rj_adm", role=UserRole.ADMIN)
    student = _user(db, "rj_st")
    host = _user(db, "rj_host")
    resp = _create_visit(db, student, host)
    visit_id = resp.json()["id"]

    resp2 = client.post(f"/api/v1/visits/{visit_id}/reject", headers=_token(admin))
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "REJECTED"


def test_cannot_reject_already_rejected(db):
    admin = _user(db, "rj_dup", role=UserRole.ADMIN)
    student = _user(db, "rj_dup_st")
    host = _user(db, "rj_dup_host")
    resp = _create_visit(db, student, host)
    visit_id = resp.json()["id"]

    client.post(f"/api/v1/visits/{visit_id}/reject", headers=_token(admin))
    resp2 = client.post(f"/api/v1/visits/{visit_id}/reject", headers=_token(admin))
    assert resp2.status_code == 422


def test_audit_visit_created(db):
    student = _user(db, "aud_cr")
    host = _user(db, "aud_cr_host")
    resp = _create_visit(db, student, host)
    visit_id = resp.json()["id"]

    log = db.query(AuditLog).filter(
        AuditLog.action == "VISIT_CREATED",
        AuditLog.entity_id == visit_id,
    ).first()
    assert log is not None


def test_audit_visit_approved(db):
    admin = _user(db, "aud_ap", role=UserRole.ADMIN)
    student = _user(db, "aud_ap_st")
    host = _user(db, "aud_ap_host")
    resp = _create_visit(db, student, host)
    visit_id = resp.json()["id"]
    client.post(f"/api/v1/visits/{visit_id}/approve", headers=_token(admin))

    log = db.query(AuditLog).filter(
        AuditLog.action == "VISIT_APPROVED",
        AuditLog.entity_id == visit_id,
    ).first()
    assert log is not None


def test_audit_visit_rejected(db):
    admin = _user(db, "aud_rj", role=UserRole.ADMIN)
    student = _user(db, "aud_rj_st")
    host = _user(db, "aud_rj_host")
    resp = _create_visit(db, student, host)
    visit_id = resp.json()["id"]
    client.post(f"/api/v1/visits/{visit_id}/reject", headers=_token(admin))

    log = db.query(AuditLog).filter(
        AuditLog.action == "VISIT_REJECTED",
        AuditLog.entity_id == visit_id,
    ).first()
    assert log is not None


# ---------------------------------------------------------------------------
# CHECK-IN
# ---------------------------------------------------------------------------

def test_valid_checkin(db):
    officer = _user(db, "ci_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "ci")
    _assignment(db, officer, gate)
    student = _user(db, "ci_st")
    host = _user(db, "ci_host")
    visit = _make_approved_visit(db, student, host)

    resp = client.post(f"/api/v1/visits/{visit.id}/check-in", headers=_token(officer))
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "CHECKED_IN"
    assert data["checked_in_at"] is not None
    assert data["checkin_gate_id"] == str(gate.id)


def test_checkin_non_officer_rejected(db):
    student = _user(db, "ci_nooff")
    host = _user(db, "ci_nooff_host")
    visit = _make_approved_visit(db, student, host)

    resp = client.post(f"/api/v1/visits/{visit.id}/check-in", headers=_token(student))
    assert resp.status_code == 403


def test_checkin_no_assignment_rejected(db):
    officer = _user(db, "ci_noasgn", role=UserRole.GATE_OFFICER)
    student = _user(db, "ci_noasgn_st")
    host = _user(db, "ci_noasgn_host")
    visit = _make_approved_visit(db, student, host)

    resp = client.post(f"/api/v1/visits/{visit.id}/check-in", headers=_token(officer))
    assert resp.status_code == 403


def test_checkin_expired_visit_rejected(db):
    officer = _user(db, "ci_exp_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "ci_exp")
    _assignment(db, officer, gate)
    student = _user(db, "ci_exp_st")
    host = _user(db, "ci_exp_host")
    # Create visit that is already expired (end in the past)
    visit = _make_approved_visit(db, student, host, start_offset=-120, end_offset=-60)

    resp = client.post(f"/api/v1/visits/{visit.id}/check-in", headers=_token(officer))
    assert resp.status_code == 422


def test_checkin_rejected_visit_rejected(db):
    officer = _user(db, "ci_rj_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "ci_rj")
    _assignment(db, officer, gate)
    admin = _user(db, "ci_rj_adm", role=UserRole.ADMIN)
    student = _user(db, "ci_rj_st")
    host = _user(db, "ci_rj_host")

    resp = _create_visit(db, student, host)
    visit_id = resp.json()["id"]
    client.post(f"/api/v1/visits/{visit_id}/reject", headers=_token(admin))

    resp2 = client.post(f"/api/v1/visits/{visit_id}/check-in", headers=_token(officer))
    assert resp2.status_code == 422


def test_checkin_pending_visit_rejected(db):
    officer = _user(db, "ci_pend_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "ci_pend")
    _assignment(db, officer, gate)
    student = _user(db, "ci_pend_st")
    host = _user(db, "ci_pend_host")

    resp = _create_visit(db, student, host)
    visit_id = resp.json()["id"]

    resp2 = client.post(f"/api/v1/visits/{visit_id}/check-in", headers=_token(officer))
    assert resp2.status_code == 422


def test_checkin_correct_gate_recorded(db):
    officer = _user(db, "ci_gate_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "ci_gate")
    _assignment(db, officer, gate)
    student = _user(db, "ci_gate_st")
    host = _user(db, "ci_gate_host")
    visit = _make_approved_visit(db, student, host)

    resp = client.post(f"/api/v1/visits/{visit.id}/check-in", headers=_token(officer))
    assert resp.status_code == 200
    assert resp.json()["checkin_gate_id"] == str(gate.id)


def test_checkin_audit_created(db):
    officer = _user(db, "ci_aud_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "ci_aud")
    _assignment(db, officer, gate)
    student = _user(db, "ci_aud_st")
    host = _user(db, "ci_aud_host")
    visit = _make_approved_visit(db, student, host)

    client.post(f"/api/v1/visits/{visit.id}/check-in", headers=_token(officer))

    log = db.query(AuditLog).filter(
        AuditLog.action == "VISIT_CHECKED_IN",
        AuditLog.entity_id == str(visit.id),
    ).first()
    assert log is not None


# ---------------------------------------------------------------------------
# CHECK-OUT
# ---------------------------------------------------------------------------

def test_valid_checkout(db):
    officer = _user(db, "co_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "co")
    _assignment(db, officer, gate)
    student = _user(db, "co_st")
    host = _user(db, "co_host")
    visit = _make_approved_visit(db, student, host)

    client.post(f"/api/v1/visits/{visit.id}/check-in", headers=_token(officer))
    resp = client.post(f"/api/v1/visits/{visit.id}/check-out", headers=_token(officer))
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "CHECKED_OUT"
    assert data["checked_out_at"] is not None
    assert data["checkout_gate_id"] == str(gate.id)


def test_checkout_non_officer_rejected(db):
    student = _user(db, "co_nooff")
    host = _user(db, "co_nooff_host")
    visit = _make_approved_visit(db, student, host)
    # Manually set to CHECKED_IN
    visit.status = VisitStatus.CHECKED_IN
    db.flush()

    resp = client.post(f"/api/v1/visits/{visit.id}/check-out", headers=_token(student))
    assert resp.status_code == 403


def test_checkout_pending_visit_rejected(db):
    officer = _user(db, "co_pend_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "co_pend")
    _assignment(db, officer, gate)
    student = _user(db, "co_pend_st")
    host = _user(db, "co_pend_host")

    resp = _create_visit(db, student, host)
    visit_id = resp.json()["id"]

    resp2 = client.post(f"/api/v1/visits/{visit_id}/check-out", headers=_token(officer))
    assert resp2.status_code == 422


def test_checkout_approved_not_checkedin_rejected(db):
    officer = _user(db, "co_appr_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "co_appr")
    _assignment(db, officer, gate)
    student = _user(db, "co_appr_st")
    host = _user(db, "co_appr_host")
    visit = _make_approved_visit(db, student, host)

    resp = client.post(f"/api/v1/visits/{visit.id}/check-out", headers=_token(officer))
    assert resp.status_code == 422


def test_checkout_already_checkedout_rejected(db):
    officer = _user(db, "co_dup_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "co_dup")
    _assignment(db, officer, gate)
    student = _user(db, "co_dup_st")
    host = _user(db, "co_dup_host")
    visit = _make_approved_visit(db, student, host)

    client.post(f"/api/v1/visits/{visit.id}/check-in", headers=_token(officer))
    client.post(f"/api/v1/visits/{visit.id}/check-out", headers=_token(officer))
    resp = client.post(f"/api/v1/visits/{visit.id}/check-out", headers=_token(officer))
    assert resp.status_code == 422


def test_checkout_audit_created(db):
    officer = _user(db, "co_aud_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "co_aud")
    _assignment(db, officer, gate)
    student = _user(db, "co_aud_st")
    host = _user(db, "co_aud_host")
    visit = _make_approved_visit(db, student, host)

    client.post(f"/api/v1/visits/{visit.id}/check-in", headers=_token(officer))
    client.post(f"/api/v1/visits/{visit.id}/check-out", headers=_token(officer))

    log = db.query(AuditLog).filter(
        AuditLog.action == "VISIT_CHECKED_OUT",
        AuditLog.entity_id == str(visit.id),
    ).first()
    assert log is not None


# ---------------------------------------------------------------------------
# CROSS-GATE CHECK-OUT
# ---------------------------------------------------------------------------

def test_cross_gate_checkin_checkout(db):
    officer_a = _user(db, "xg_a", role=UserRole.GATE_OFFICER)
    officer_b = _user(db, "xg_b", role=UserRole.GATE_OFFICER)
    gate1 = _gate(db, "xg1")
    gate2 = _gate(db, "xg2")
    _assignment(db, officer_a, gate1)
    _assignment(db, officer_b, gate2)

    student = _user(db, "xg_st")
    host = _user(db, "xg_host")
    visit = _make_approved_visit(db, student, host)

    resp_in = client.post(f"/api/v1/visits/{visit.id}/check-in", headers=_token(officer_a))
    assert resp_in.status_code == 200
    assert resp_in.json()["checkin_gate_id"] == str(gate1.id)

    resp_out = client.post(f"/api/v1/visits/{visit.id}/check-out", headers=_token(officer_b))
    assert resp_out.status_code == 200
    data = resp_out.json()
    assert data["checkout_gate_id"] == str(gate2.id)
    assert data["checkin_gate_id"] == str(gate1.id)  # preserved
    assert data["status"] == "CHECKED_OUT"


# ---------------------------------------------------------------------------
# QR VALUE
# ---------------------------------------------------------------------------

def test_qr_generated_on_approval(db):
    admin = _user(db, "qr_adm", role=UserRole.ADMIN)
    student = _user(db, "qr_st")
    host = _user(db, "qr_host")
    resp = _create_visit(db, student, host)
    visit_id = resp.json()["id"]

    resp2 = client.post(f"/api/v1/visits/{visit_id}/approve", headers=_token(admin))
    qr = resp2.json()["qr_code_value"]
    assert qr is not None
    assert qr.startswith("CG-VISIT-")


def test_qr_not_in_pending(db):
    student = _user(db, "qr_pend")
    host = _user(db, "qr_pend_host")
    resp = _create_visit(db, student, host)
    assert resp.json()["qr_code_value"] is None


def test_qr_does_not_contain_personal_info(db):
    admin = _user(db, "qr_pii_adm", role=UserRole.ADMIN)
    student = _user(db, "qr_pii_st")
    host = _user(db, "qr_pii_host")
    payload = _visit_payload(host.id)
    payload["visitor"]["full_name"] = "John Doe"
    payload["visitor"]["identification_number"] = "ID-SECRET-123"
    resp = client.post("/api/v1/visits", json=payload, headers=_token(student))
    visit_id = resp.json()["id"]

    resp2 = client.post(f"/api/v1/visits/{visit_id}/approve", headers=_token(admin))
    qr = resp2.json()["qr_code_value"]
    assert "John" not in qr
    assert "Doe" not in qr
    assert "SECRET" not in qr
    assert "ID-" not in qr


def test_qr_values_are_unique(db):
    admin = _user(db, "qr_uniq_adm", role=UserRole.ADMIN)
    student = _user(db, "qr_uniq_st")
    host = _user(db, "qr_uniq_host")

    qr_values = set()
    for i in range(5):
        resp = _create_visit(db, student, host)
        visit_id = resp.json()["id"]
        resp2 = client.post(f"/api/v1/visits/{visit_id}/approve", headers=_token(admin))
        qr_values.add(resp2.json()["qr_code_value"])

    assert len(qr_values) == 5


# ---------------------------------------------------------------------------
# CONCURRENCY / TRANSACTION SAFETY
# ---------------------------------------------------------------------------

def test_failed_checkin_does_not_change_status(db):
    """Check-in on a PENDING visit must not alter status."""
    officer = _user(db, "tx_ci_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "tx_ci")
    _assignment(db, officer, gate)
    student = _user(db, "tx_ci_st")
    host = _user(db, "tx_ci_host")

    resp = _create_visit(db, student, host)
    visit_id = resp.json()["id"]

    client.post(f"/api/v1/visits/{visit_id}/check-in", headers=_token(officer))  # 422

    visit = db.get(Visit, uuid.UUID(visit_id))
    db.refresh(visit)
    assert visit.status == VisitStatus.PENDING


def test_failed_checkout_does_not_change_status(db):
    """Check-out on an APPROVED (not checked-in) visit must not alter status."""
    officer = _user(db, "tx_co_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "tx_co")
    _assignment(db, officer, gate)
    student = _user(db, "tx_co_st")
    host = _user(db, "tx_co_host")
    visit = _make_approved_visit(db, student, host)

    client.post(f"/api/v1/visits/{visit.id}/check-out", headers=_token(officer))  # 422

    db.refresh(visit)
    assert visit.status == VisitStatus.APPROVED
