"""
Stage 2 backend read/query API tests.
Covers: user search, device list, movements, incidents, visits list,
        audit logs, gates, gate assignments.
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
from app.models.enums import (
    DeviceStatus, DeviceType, IncidentStatus, IncidentType,
    MovementType, UserRole, VisitStatus, IdentificationType,
)
from app.models.gate import Gate
from app.models.gate_assignment import GateAssignment
from app.models.incident import Incident
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
    app.dependency_overrides.pop(get_db, None)
    session.close()
    transaction.rollback()
    connection.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user(db, suffix, role=UserRole.STUDENT, active=True, campus_id=None):
    u = User(
        full_name=f"User {suffix}",
        email=f"q_{suffix}@test.com",
        password_hash=hash_password("pass"),
        role=role,
        is_active=active,
        campus_id=campus_id or f"CID-{suffix}",
    )
    db.add(u)
    db.flush()
    db.refresh(u)
    return u


def _gate(db, suffix):
    g = Gate(name=f"Gate {suffix}", code=f"QG-{suffix}")
    db.add(g)
    db.flush()
    db.refresh(g)
    return g


def _assignment(db, officer, gate, active=True, start_offset=-30, end_offset=480):
    now = datetime.now(timezone.utc)
    a = GateAssignment(
        officer_id=officer.id,
        gate_id=gate.id,
        is_active=active,
        start_time=now + timedelta(minutes=start_offset),
        end_time=now + timedelta(minutes=end_offset),
    )
    db.add(a)
    db.flush()
    db.refresh(a)
    return a


def _device(db, owner, suffix, status=DeviceStatus.INSIDE_CAMPUS):
    d = Device(
        asset_id=f"CG-DEV-Q{suffix}",
        serial_number=f"SN-Q{suffix}",
        device_type=DeviceType.LAPTOP,
        owner_id=owner.id,
        status=status,
        qr_code_value=f"CG-DEV-QR{suffix}",
    )
    db.add(d)
    db.flush()
    db.refresh(d)
    return d


def _movement(db, device, officer, gate, mtype=MovementType.CHECK_OUT):
    m = DeviceMovement(
        device_id=device.id,
        officer_id=officer.id,
        gate_id=gate.id,
        movement_type=mtype,
    )
    db.add(m)
    db.flush()
    db.refresh(m)
    return m


def _incident(db, device, reporter, itype=IncidentType.OTHER):
    inc = Incident(
        device_id=device.id,
        reported_by=reporter.id,
        incident_type=itype,
        description="Test incident",
        status=IncidentStatus.OPEN,
    )
    db.add(inc)
    db.flush()
    db.refresh(inc)
    return inc


def _visit(db, host, status=VisitStatus.PENDING):
    now = datetime.now(timezone.utc)
    visitor = Visitor(
        full_name=f"Visitor {uuid.uuid4().hex[:6]}",
        identification_type=IdentificationType.NATIONAL_ID,
        identification_number=f"ID-{uuid.uuid4().hex[:8]}",
    )
    db.add(visitor)
    db.flush()
    v = Visit(
        visitor_id=visitor.id,
        host_user_id=host.id,
        status=status,
        expected_start_at=now,
        expected_end_at=now + timedelta(hours=2),
    )
    db.add(v)
    db.flush()
    db.refresh(v)
    return v


def _audit_log(db, actor, action, entity_type="device", entity_id=None):
    log = AuditLog(
        actor_id=actor.id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id or str(uuid.uuid4()),
    )
    db.add(log)
    db.flush()
    db.refresh(log)
    return log


def _token(user):
    return {"Authorization": f"Bearer {create_access_token(user.id, user.role.value)}"}


# ===========================================================================
# 1. USER SEARCH
# ===========================================================================

def test_user_search_by_campus_id(db):
    officer = _user(db, "us_off", role=UserRole.GATE_OFFICER)
    target = _user(db, "us_target", campus_id="ASTU-SEARCH-001")
    resp = client.get("/api/v1/users?search=ASTU-SEARCH-001", headers=_token(officer))
    assert resp.status_code == 200
    ids = [u["id"] for u in resp.json()]
    assert str(target.id) in ids


def test_user_search_by_name(db):
    officer = _user(db, "us_name_off", role=UserRole.GATE_OFFICER)
    target = _user(db, "us_name_target")
    target.full_name = "Unique Findable Name XYZ"
    db.flush()
    resp = client.get("/api/v1/users?search=Unique+Findable+Name", headers=_token(officer))
    assert resp.status_code == 200
    ids = [u["id"] for u in resp.json()]
    assert str(target.id) in ids


def test_user_search_by_email(db):
    officer = _user(db, "us_email_off", role=UserRole.GATE_OFFICER)
    target = _user(db, "us_email_target")
    resp = client.get(f"/api/v1/users?search=q_us_email_target", headers=_token(officer))
    assert resp.status_code == 200
    ids = [u["id"] for u in resp.json()]
    assert str(target.id) in ids


def test_user_search_admin_allowed(db):
    admin = _user(db, "us_adm", role=UserRole.ADMIN)
    _user(db, "us_adm_target", campus_id="ADMIN-SRCH-99")
    resp = client.get("/api/v1/users?search=ADMIN-SRCH-99", headers=_token(admin))
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_user_search_student_forbidden(db):
    student = _user(db, "us_st_forbidden")
    resp = client.get("/api/v1/users?search=anything", headers=_token(student))
    assert resp.status_code == 403


def test_user_search_staff_forbidden(db):
    staff = _user(db, "us_sf_forbidden", role=UserRole.STAFF)
    resp = client.get("/api/v1/users?search=anything", headers=_token(staff))
    assert resp.status_code == 403


def test_user_search_no_token(db):
    resp = client.get("/api/v1/users?search=anything")
    assert resp.status_code == 401


def test_user_search_empty_results(db):
    officer = _user(db, "us_empty_off", role=UserRole.GATE_OFFICER)
    resp = client.get("/api/v1/users?search=ZZZNOMATCH99999", headers=_token(officer))
    assert resp.status_code == 200
    assert resp.json() == []


def test_user_search_no_password_hash(db):
    officer = _user(db, "us_nohash_off", role=UserRole.GATE_OFFICER)
    _user(db, "us_nohash_target", campus_id="NOHASH-001")
    resp = client.get("/api/v1/users?search=NOHASH-001", headers=_token(officer))
    assert resp.status_code == 200
    assert "password_hash" not in resp.text
    assert "password" not in resp.text


def test_user_search_inactive_excluded(db):
    officer = _user(db, "us_inact_off", role=UserRole.GATE_OFFICER)
    inactive = _user(db, "us_inact_target", active=False, campus_id="INACTIVE-SRCH-001")
    resp = client.get("/api/v1/users?search=INACTIVE-SRCH-001", headers=_token(officer))
    assert resp.status_code == 200
    ids = [u["id"] for u in resp.json()]
    assert str(inactive.id) not in ids


def test_user_search_missing_query_param(db):
    officer = _user(db, "us_noparam_off", role=UserRole.GATE_OFFICER)
    resp = client.get("/api/v1/users", headers=_token(officer))
    assert resp.status_code == 422


# ===========================================================================
# 2. DEVICE LIST / SEARCH
# ===========================================================================

def test_device_list_officer_sees_all(db):
    officer = _user(db, "dl_off", role=UserRole.GATE_OFFICER)
    owner = _user(db, "dl_own")
    dev = _device(db, owner, "DL01")
    resp = client.get("/api/v1/devices", headers=_token(officer))
    assert resp.status_code == 200
    ids = [d["id"] for d in resp.json()]
    assert str(dev.id) in ids


def test_device_list_admin_sees_all(db):
    admin = _user(db, "dl_adm", role=UserRole.ADMIN)
    owner = _user(db, "dl_adm_own")
    dev = _device(db, owner, "DL02")
    resp = client.get("/api/v1/devices", headers=_token(admin))
    assert resp.status_code == 200
    ids = [d["id"] for d in resp.json()]
    assert str(dev.id) in ids


def test_device_list_student_sees_only_own(db):
    student = _user(db, "dl_st")
    other = _user(db, "dl_st_other")
    own_dev = _device(db, student, "DL03")
    other_dev = _device(db, other, "DL04")
    resp = client.get("/api/v1/devices", headers=_token(student))
    assert resp.status_code == 200
    ids = [d["id"] for d in resp.json()]
    assert str(own_dev.id) in ids
    assert str(other_dev.id) not in ids


def test_device_list_filter_by_serial(db):
    officer = _user(db, "dl_ser_off", role=UserRole.GATE_OFFICER)
    owner = _user(db, "dl_ser_own")
    dev = _device(db, owner, "DL05")
    resp = client.get(f"/api/v1/devices?serial=SN-QDL05", headers=_token(officer))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["serial_number"] == "SN-QDL05"


def test_device_list_filter_by_asset_id(db):
    officer = _user(db, "dl_aid_off", role=UserRole.GATE_OFFICER)
    owner = _user(db, "dl_aid_own")
    dev = _device(db, owner, "DL06")
    resp = client.get(f"/api/v1/devices?asset_id=CG-DEV-QDL06", headers=_token(officer))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["asset_id"] == "CG-DEV-QDL06"


def test_device_list_filter_by_status(db):
    officer = _user(db, "dl_stat_off", role=UserRole.GATE_OFFICER)
    owner = _user(db, "dl_stat_own")
    _device(db, owner, "DL07", status=DeviceStatus.OUTSIDE_CAMPUS)
    resp = client.get("/api/v1/devices?status=OUTSIDE_CAMPUS", headers=_token(officer))
    assert resp.status_code == 200
    for d in resp.json():
        assert d["status"] == "OUTSIDE_CAMPUS"


def test_device_list_filter_by_owner_id(db):
    officer = _user(db, "dl_own_off", role=UserRole.GATE_OFFICER)
    owner = _user(db, "dl_own_target")
    dev = _device(db, owner, "DL08")
    resp = client.get(f"/api/v1/devices?owner_id={owner.id}", headers=_token(officer))
    assert resp.status_code == 200
    ids = [d["id"] for d in resp.json()]
    assert str(dev.id) in ids


def test_device_list_empty_results(db):
    officer = _user(db, "dl_empty_off", role=UserRole.GATE_OFFICER)
    resp = client.get(f"/api/v1/devices?serial=SN-DOESNOTEXIST-ZZZZZ", headers=_token(officer))
    assert resp.status_code == 200
    assert resp.json() == []


def test_device_list_no_token():
    resp = client.get("/api/v1/devices")
    assert resp.status_code == 401


def test_device_list_invalid_uuid(db):
    officer = _user(db, "dl_uuid_off", role=UserRole.GATE_OFFICER)
    resp = client.get("/api/v1/devices?owner_id=not-a-uuid", headers=_token(officer))
    assert resp.status_code == 422


# ===========================================================================
# 3. DEVICE MOVEMENT HISTORY
# ===========================================================================

def test_device_movements_officer(db):
    officer = _user(db, "mv_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "mv_off")
    owner = _user(db, "mv_own")
    dev = _device(db, owner, "MV01")
    _movement(db, dev, officer, gate)
    resp = client.get(f"/api/v1/devices/{dev.id}/movements", headers=_token(officer))
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["movement_type"] == "CHECK_OUT"


def test_device_movements_owner_can_view_own(db):
    officer = _user(db, "mv_own_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "mv_own")
    owner = _user(db, "mv_own_owner")
    dev = _device(db, owner, "MV02")
    _movement(db, dev, officer, gate)
    resp = client.get(f"/api/v1/devices/{dev.id}/movements", headers=_token(owner))
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_device_movements_student_cannot_view_others(db):
    officer = _user(db, "mv_st_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "mv_st")
    owner = _user(db, "mv_st_own")
    other = _user(db, "mv_st_other")
    dev = _device(db, owner, "MV03")
    _movement(db, dev, officer, gate)
    resp = client.get(f"/api/v1/devices/{dev.id}/movements", headers=_token(other))
    assert resp.status_code == 403


def test_device_movements_nonexistent_device(db):
    officer = _user(db, "mv_404_off", role=UserRole.GATE_OFFICER)
    resp = client.get(f"/api/v1/devices/{uuid.uuid4()}/movements", headers=_token(officer))
    assert resp.status_code == 404


def test_device_movements_empty(db):
    officer = _user(db, "mv_empty_off", role=UserRole.GATE_OFFICER)
    owner = _user(db, "mv_empty_own")
    dev = _device(db, owner, "MV04")
    resp = client.get(f"/api/v1/devices/{dev.id}/movements", headers=_token(officer))
    assert resp.status_code == 200
    assert resp.json() == []


def test_movements_list_officer(db):
    officer = _user(db, "mvl_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "mvl")
    owner = _user(db, "mvl_own")
    dev = _device(db, owner, "MVL01")
    _movement(db, dev, officer, gate)
    resp = client.get("/api/v1/movements", headers=_token(officer))
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_movements_list_student_forbidden(db):
    student = _user(db, "mvl_st")
    resp = client.get("/api/v1/movements", headers=_token(student))
    assert resp.status_code == 403


def test_movements_list_filter_by_device(db):
    officer = _user(db, "mvl_dev_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "mvl_dev")
    owner = _user(db, "mvl_dev_own")
    dev = _device(db, owner, "MVL02")
    _movement(db, dev, officer, gate)
    resp = client.get(f"/api/v1/movements?device_id={dev.id}", headers=_token(officer))
    assert resp.status_code == 200
    for m in resp.json():
        assert m["device_id"] == str(dev.id)


def test_movements_list_filter_by_type(db):
    officer = _user(db, "mvl_type_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "mvl_type")
    owner = _user(db, "mvl_type_own")
    dev = _device(db, owner, "MVL03", status=DeviceStatus.OUTSIDE_CAMPUS)
    _movement(db, dev, officer, gate, mtype=MovementType.CHECK_IN)
    resp = client.get("/api/v1/movements?movement_type=CHECK_IN", headers=_token(officer))
    assert resp.status_code == 200
    for m in resp.json():
        assert m["movement_type"] == "CHECK_IN"


def test_movements_list_invalid_uuid(db):
    officer = _user(db, "mvl_uuid_off", role=UserRole.GATE_OFFICER)
    resp = client.get("/api/v1/movements?device_id=not-a-uuid", headers=_token(officer))
    assert resp.status_code == 422


# ===========================================================================
# 4. INCIDENTS
# ===========================================================================

def test_incident_list_officer(db):
    officer = _user(db, "il_off", role=UserRole.GATE_OFFICER)
    owner = _user(db, "il_own")
    dev = _device(db, owner, "IL01")
    _incident(db, dev, officer)
    resp = client.get("/api/v1/incidents", headers=_token(officer))
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_incident_list_admin(db):
    admin = _user(db, "il_adm", role=UserRole.ADMIN)
    owner = _user(db, "il_adm_own")
    dev = _device(db, owner, "IL02")
    _incident(db, dev, admin)
    resp = client.get("/api/v1/incidents", headers=_token(admin))
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_incident_list_student_sees_only_own(db):
    student = _user(db, "il_st")
    other = _user(db, "il_st_other")
    dev1 = _device(db, student, "IL03")
    dev2 = _device(db, other, "IL04")
    own_inc = _incident(db, dev1, student)
    other_inc = _incident(db, dev2, other)
    resp = client.get("/api/v1/incidents", headers=_token(student))
    assert resp.status_code == 200
    ids = [i["id"] for i in resp.json()]
    assert str(own_inc.id) in ids
    assert str(other_inc.id) not in ids


def test_incident_list_filter_by_type(db):
    officer = _user(db, "il_type_off", role=UserRole.GATE_OFFICER)
    owner = _user(db, "il_type_own")
    dev = _device(db, owner, "IL05")
    _incident(db, dev, officer, itype=IncidentType.OWNER_MISMATCH)
    resp = client.get("/api/v1/incidents?incident_type=OWNER_MISMATCH", headers=_token(officer))
    assert resp.status_code == 200
    for i in resp.json():
        assert i["incident_type"] == "OWNER_MISMATCH"


def test_incident_list_filter_by_status(db):
    officer = _user(db, "il_stat_off", role=UserRole.GATE_OFFICER)
    owner = _user(db, "il_stat_own")
    dev = _device(db, owner, "IL06")
    _incident(db, dev, officer)
    resp = client.get("/api/v1/incidents?status=OPEN", headers=_token(officer))
    assert resp.status_code == 200
    for i in resp.json():
        assert i["status"] == "OPEN"


def test_incident_list_empty(db):
    officer = _user(db, "il_empty_off", role=UserRole.GATE_OFFICER)
    resp = client.get("/api/v1/incidents?status=CLOSED", headers=_token(officer))
    assert resp.status_code == 200


def test_incident_create_officer(db):
    officer = _user(db, "ic_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "ic_off")
    owner = _user(db, "ic_own")
    dev = _device(db, owner, "IC01")
    resp = client.post("/api/v1/incidents", json={
        "device_id": str(dev.id),
        "reported_by": str(officer.id),
        "gate_id": str(gate.id),
        "incident_type": "OWNER_MISMATCH",
        "description": "Bearer does not match registered owner",
    }, headers=_token(officer))
    assert resp.status_code == 201
    data = resp.json()
    assert data["incident_type"] == "OWNER_MISMATCH"
    assert data["status"] == "OPEN"
    # reported_by must be the authenticated officer, not a spoofed value
    assert data["reported_by"] == str(officer.id)


def test_incident_create_admin(db):
    admin = _user(db, "ic_adm", role=UserRole.ADMIN)
    owner = _user(db, "ic_adm_own")
    dev = _device(db, owner, "IC02")
    resp = client.post("/api/v1/incidents", json={
        "incident_type": "OTHER",
        "description": "Admin-created incident",
    }, headers=_token(admin))
    assert resp.status_code == 201


def test_incident_create_student_forbidden(db):
    student = _user(db, "ic_st")
    resp = client.post("/api/v1/incidents", json={
        "incident_type": "OTHER",
        "description": "Student trying to create incident",
    }, headers=_token(student))
    assert resp.status_code == 403


def test_incident_create_invalid_device_uuid(db):
    officer = _user(db, "ic_uuid_off", role=UserRole.GATE_OFFICER)
    resp = client.post("/api/v1/incidents", json={
        "device_id": "not-a-uuid",
        "incident_type": "OTHER",
        "description": "Bad UUID",
    }, headers=_token(officer))
    assert resp.status_code == 422


def test_incident_create_reported_by_overridden(db):
    """reported_by in body must be ignored — actor.id is always used."""
    officer = _user(db, "ic_spoof_off", role=UserRole.GATE_OFFICER)
    other = _user(db, "ic_spoof_other")
    resp = client.post("/api/v1/incidents", json={
        "reported_by": str(other.id),
        "incident_type": "OTHER",
        "description": "Spoofed reporter",
    }, headers=_token(officer))
    assert resp.status_code == 201
    assert resp.json()["reported_by"] == str(officer.id)


# ===========================================================================
# 5. VISIT LIST
# ===========================================================================

def test_visit_list_officer(db):
    officer = _user(db, "vl_off", role=UserRole.GATE_OFFICER)
    host = _user(db, "vl_host")
    _visit(db, host)
    resp = client.get("/api/v1/visits", headers=_token(officer))
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_visit_list_admin(db):
    admin = _user(db, "vl_adm", role=UserRole.ADMIN)
    host = _user(db, "vl_adm_host")
    _visit(db, host)
    resp = client.get("/api/v1/visits", headers=_token(admin))
    assert resp.status_code == 200


def test_visit_list_student_forbidden(db):
    student = _user(db, "vl_st")
    resp = client.get("/api/v1/visits", headers=_token(student))
    assert resp.status_code == 403


def test_visit_list_filter_by_status(db):
    officer = _user(db, "vl_stat_off", role=UserRole.GATE_OFFICER)
    host = _user(db, "vl_stat_host")
    _visit(db, host, status=VisitStatus.APPROVED)
    resp = client.get("/api/v1/visits?status=APPROVED", headers=_token(officer))
    assert resp.status_code == 200
    for v in resp.json():
        assert v["status"] == "APPROVED"


def test_visit_list_filter_by_host(db):
    officer = _user(db, "vl_host_off", role=UserRole.GATE_OFFICER)
    host = _user(db, "vl_host_target")
    v = _visit(db, host)
    resp = client.get(f"/api/v1/visits?host_user_id={host.id}", headers=_token(officer))
    assert resp.status_code == 200
    ids = [x["id"] for x in resp.json()]
    assert str(v.id) in ids


def test_visit_list_empty(db):
    officer = _user(db, "vl_empty_off", role=UserRole.GATE_OFFICER)
    resp = client.get(f"/api/v1/visits?visitor_id={uuid.uuid4()}", headers=_token(officer))
    assert resp.status_code == 200
    assert resp.json() == []


# ===========================================================================
# 6. AUDIT LOGS
# ===========================================================================

def test_audit_log_list_admin(db):
    admin = _user(db, "al_adm", role=UserRole.ADMIN)
    _audit_log(db, admin, "TEST_ACTION")
    resp = client.get("/api/v1/audit-logs", headers=_token(admin))
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_audit_log_list_officer_forbidden(db):
    officer = _user(db, "al_off", role=UserRole.GATE_OFFICER)
    resp = client.get("/api/v1/audit-logs", headers=_token(officer))
    assert resp.status_code == 403


def test_audit_log_list_student_forbidden(db):
    student = _user(db, "al_st")
    resp = client.get("/api/v1/audit-logs", headers=_token(student))
    assert resp.status_code == 403


def test_audit_log_filter_by_action(db):
    admin = _user(db, "al_act_adm", role=UserRole.ADMIN)
    _audit_log(db, admin, "UNIQUE_ACTION_XYZ")
    resp = client.get("/api/v1/audit-logs?action=UNIQUE_ACTION_XYZ", headers=_token(admin))
    assert resp.status_code == 200
    for log in resp.json():
        assert log["action"] == "UNIQUE_ACTION_XYZ"


def test_audit_log_filter_by_entity_type(db):
    admin = _user(db, "al_ent_adm", role=UserRole.ADMIN)
    _audit_log(db, admin, "SOME_ACTION", entity_type="gate")
    resp = client.get("/api/v1/audit-logs?entity_type=gate", headers=_token(admin))
    assert resp.status_code == 200
    for log in resp.json():
        assert log["entity_type"] == "gate"


def test_audit_log_no_password_hash(db):
    admin = _user(db, "al_nohash_adm", role=UserRole.ADMIN)
    _audit_log(db, admin, "NOHASH_ACTION")
    resp = client.get("/api/v1/audit-logs", headers=_token(admin))
    assert resp.status_code == 200
    assert "password_hash" not in resp.text


# ===========================================================================
# 7. GATES
# ===========================================================================

def test_gate_list_admin(db):
    admin = _user(db, "gl_adm", role=UserRole.ADMIN)
    _gate(db, "GL01")
    resp = client.get("/api/v1/gates", headers=_token(admin))
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_gate_list_officer_forbidden(db):
    officer = _user(db, "gl_off", role=UserRole.GATE_OFFICER)
    resp = client.get("/api/v1/gates", headers=_token(officer))
    assert resp.status_code == 403


def test_gate_list_student_forbidden(db):
    student = _user(db, "gl_st")
    resp = client.get("/api/v1/gates", headers=_token(student))
    assert resp.status_code == 403


def test_gate_create_admin(db):
    admin = _user(db, "gc_adm", role=UserRole.ADMIN)
    resp = client.post("/api/v1/gates", json={
        "name": "Test Gate Alpha",
        "code": "TGA-001",
        "location": "North entrance",
    }, headers=_token(admin))
    assert resp.status_code == 201
    data = resp.json()
    assert data["code"] == "TGA-001"
    assert data["name"] == "Test Gate Alpha"
    assert data["is_active"] is True


def test_gate_create_duplicate_code(db):
    admin = _user(db, "gc_dup_adm", role=UserRole.ADMIN)
    client.post("/api/v1/gates", json={"name": "Gate Dup", "code": "DUP-001"}, headers=_token(admin))
    resp = client.post("/api/v1/gates", json={"name": "Gate Dup 2", "code": "DUP-001"}, headers=_token(admin))
    assert resp.status_code == 409


def test_gate_create_officer_forbidden(db):
    officer = _user(db, "gc_off", role=UserRole.GATE_OFFICER)
    resp = client.post("/api/v1/gates", json={"name": "X", "code": "X-001"}, headers=_token(officer))
    assert resp.status_code == 403


def test_gate_create_student_forbidden(db):
    student = _user(db, "gc_st")
    resp = client.post("/api/v1/gates", json={"name": "X", "code": "X-002"}, headers=_token(student))
    assert resp.status_code == 403


# ===========================================================================
# 8. GATE ASSIGNMENTS
# ===========================================================================

def test_gate_assignment_list_admin(db):
    admin = _user(db, "ga_adm", role=UserRole.ADMIN)
    officer = _user(db, "ga_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "GA01")
    _assignment(db, officer, gate)
    resp = client.get("/api/v1/gate-assignments", headers=_token(admin))
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_gate_assignment_list_officer_forbidden(db):
    officer = _user(db, "ga_off_forbidden", role=UserRole.GATE_OFFICER)
    resp = client.get("/api/v1/gate-assignments", headers=_token(officer))
    assert resp.status_code == 403


def test_gate_assignment_create_admin(db):
    admin = _user(db, "gac_adm", role=UserRole.ADMIN)
    officer = _user(db, "gac_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "GAC01")
    now = datetime.now(timezone.utc)
    resp = client.post("/api/v1/gate-assignments", json={
        "officer_id": str(officer.id),
        "gate_id": str(gate.id),
        "start_time": (now - timedelta(hours=1)).isoformat(),
        "end_time": (now + timedelta(hours=7)).isoformat(),
    }, headers=_token(admin))
    assert resp.status_code == 201
    data = resp.json()
    assert data["officer_id"] == str(officer.id)
    assert data["gate_id"] == str(gate.id)
    assert data["is_active"] is True


def test_gate_assignment_create_officer_forbidden(db):
    officer = _user(db, "gac_off_forbidden", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "GAC02")
    now = datetime.now(timezone.utc)
    resp = client.post("/api/v1/gate-assignments", json={
        "officer_id": str(officer.id),
        "gate_id": str(gate.id),
        "start_time": now.isoformat(),
    }, headers=_token(officer))
    assert resp.status_code == 403


def test_gate_assignment_invalid_officer(db):
    admin = _user(db, "gac_badoff_adm", role=UserRole.ADMIN)
    gate = _gate(db, "GAC03")
    now = datetime.now(timezone.utc)
    resp = client.post("/api/v1/gate-assignments", json={
        "officer_id": str(uuid.uuid4()),
        "gate_id": str(gate.id),
        "start_time": now.isoformat(),
    }, headers=_token(admin))
    assert resp.status_code == 404


def test_gate_assignment_non_officer_user_rejected(db):
    admin = _user(db, "gac_nooff_adm", role=UserRole.ADMIN)
    student = _user(db, "gac_nooff_st")
    gate = _gate(db, "GAC04")
    now = datetime.now(timezone.utc)
    resp = client.post("/api/v1/gate-assignments", json={
        "officer_id": str(student.id),
        "gate_id": str(gate.id),
        "start_time": now.isoformat(),
    }, headers=_token(admin))
    assert resp.status_code == 422


def test_gate_assignment_invalid_gate(db):
    admin = _user(db, "gac_badgate_adm", role=UserRole.ADMIN)
    officer = _user(db, "gac_badgate_off", role=UserRole.GATE_OFFICER)
    now = datetime.now(timezone.utc)
    resp = client.post("/api/v1/gate-assignments", json={
        "officer_id": str(officer.id),
        "gate_id": str(uuid.uuid4()),
        "start_time": now.isoformat(),
    }, headers=_token(admin))
    assert resp.status_code == 404


def test_gate_assignment_overlapping_rejected(db):
    admin = _user(db, "gac_ovlp_adm", role=UserRole.ADMIN)
    officer = _user(db, "gac_ovlp_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "GAC05")
    now = datetime.now(timezone.utc)
    # First assignment
    client.post("/api/v1/gate-assignments", json={
        "officer_id": str(officer.id),
        "gate_id": str(gate.id),
        "start_time": (now - timedelta(hours=1)).isoformat(),
        "end_time": (now + timedelta(hours=7)).isoformat(),
    }, headers=_token(admin))
    # Overlapping second assignment
    resp = client.post("/api/v1/gate-assignments", json={
        "officer_id": str(officer.id),
        "gate_id": str(gate.id),
        "start_time": (now + timedelta(hours=1)).isoformat(),
        "end_time": (now + timedelta(hours=9)).isoformat(),
    }, headers=_token(admin))
    assert resp.status_code == 409


def test_gate_assignment_end_before_start_rejected(db):
    admin = _user(db, "gac_time_adm", role=UserRole.ADMIN)
    officer = _user(db, "gac_time_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "GAC06")
    now = datetime.now(timezone.utc)
    resp = client.post("/api/v1/gate-assignments", json={
        "officer_id": str(officer.id),
        "gate_id": str(gate.id),
        "start_time": (now + timedelta(hours=5)).isoformat(),
        "end_time": (now + timedelta(hours=1)).isoformat(),
    }, headers=_token(admin))
    assert resp.status_code == 422


def test_gate_assignment_filter_active_only(db):
    admin = _user(db, "gaf_adm", role=UserRole.ADMIN)
    officer = _user(db, "gaf_off", role=UserRole.GATE_OFFICER)
    gate = _gate(db, "GAF01")
    _assignment(db, officer, gate, active=False)
    resp = client.get("/api/v1/gate-assignments?active_only=true", headers=_token(admin))
    assert resp.status_code == 200
    for a in resp.json():
        assert a["is_active"] is True
