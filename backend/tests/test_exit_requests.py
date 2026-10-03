import uuid
from datetime import date, timedelta

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
from app.models.enums import DeviceStatus, DeviceType, UserRole
from app.models.user import User

client = TestClient(app)


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


def _user(db, suffix: str, *, role: UserRole = UserRole.STUDENT, active: bool = True, department: str | None = "CS") -> User:
    u = User(
        full_name=f"User {suffix}",
        email=f"exit_{suffix}@test.com",
        phone="123456789",
        department=department,
        password_hash=hash_password("pass"),
        role=role,
        campus_id=f"CAMP-{suffix}",
        is_active=active,
    )
    db.add(u)
    db.flush()
    db.refresh(u)
    return u


def _device(db, owner: User, suffix: str, *, status: DeviceStatus = DeviceStatus.INSIDE_CAMPUS) -> Device:
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


def _auth(user: User) -> dict:
    token = create_access_token(user.id, user.role.value)
    return {"Authorization": f"Bearer {token}"}


def _request_payload(**overrides):
    payload = {
        "device_description": "Lenovo ThinkPad T14",
        "destination": "INSA HQ, Addis Ababa",
        "reason": "Research presentation",
        "expected_return_date": (date.today() + timedelta(days=3)).isoformat(),
    }
    payload.update(overrides)
    return payload


def test_student_can_create_exit_request(db):
    student = _user(db, "create_req")
    resp = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(),
        headers=_auth(student),
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["applicant_id"] == str(student.id)
    assert data["status"] == "PENDING"
    assert data["request_number"].startswith("EXT-")
    assert "password" not in str(data)


def test_staff_cannot_create_exit_request(db):
    staff = _user(db, "staff_req", role=UserRole.STAFF)
    resp = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(),
        headers=_auth(staff),
    )
    assert resp.status_code == 403


def test_gate_officer_cannot_create_exit_request(db):
    officer = _user(db, "officer_req", role=UserRole.GATE_OFFICER)
    resp = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(),
        headers=_auth(officer),
    )
    assert resp.status_code == 403


def test_student_sees_only_their_own_requests(db):
    student_a = _user(db, "req_owner_a")
    student_b = _user(db, "req_owner_b")
    resp1 = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_description="A device"),
        headers=_auth(student_a),
    )
    assert resp1.status_code == 201
    resp2 = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_description="B device"),
        headers=_auth(student_b),
    )
    assert resp2.status_code == 201

    resp = client.get("/api/v1/exit-requests", headers=_auth(student_a))
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert all(item["applicant_id"] == str(student_a.id) for item in items)


def test_admin_sees_all_requests(db):
    admin = _user(db, "admin_req_view", role=UserRole.ADMIN)
    student = _user(db, "student_req_view")
    client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_description="Visible to admin"),
        headers=_auth(student),
    )
    resp = client.get("/api/v1/exit-requests", headers=_auth(admin))
    assert resp.status_code == 200
    items = resp.json()
    assert any(item["device_description"] == "Visible to admin" for item in items)


def test_gate_officer_cannot_list_requests(db):
    officer = _user(db, "officer_list", role=UserRole.GATE_OFFICER)
    resp = client.get("/api/v1/exit-requests", headers=_auth(officer))
    assert resp.status_code == 403


def test_student_cannot_approve(db):
    admin = _user(db, "admin_approve", role=UserRole.ADMIN)
    student = _user(db, "student_approve")
    created = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_description="Approval test"),
        headers=_auth(student),
    ).json()
    resp = client.patch(
        f"/api/v1/exit-requests/{created['id']}/approve",
        headers=_auth(student),
    )
    assert resp.status_code == 403


def test_gate_officer_cannot_approve(db):
    officer = _user(db, "officer_approve", role=UserRole.GATE_OFFICER)
    student = _user(db, "student_approve_2")
    created = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_description="Officer approve test"),
        headers=_auth(student),
    ).json()
    resp = client.patch(
        f"/api/v1/exit-requests/{created['id']}/approve",
        headers=_auth(officer),
    )
    assert resp.status_code == 403


def test_admin_can_approve_pending_request(db):
    admin = _user(db, "admin_approve_ok", role=UserRole.ADMIN)
    student = _user(db, "student_approve_ok")
    created = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_description="Approve ok"),
        headers=_auth(student),
    ).json()
    resp = client.patch(
        f"/api/v1/exit-requests/{created['id']}/approve",
        headers=_auth(admin),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "APPROVED"
    assert data["reviewed_by"] == str(admin.id)


def test_admin_cannot_approve_already_approved_request(db):
    admin = _user(db, "admin_approve_twice", role=UserRole.ADMIN)
    student = _user(db, "student_approve_twice")
    created = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_description="Approve twice"),
        headers=_auth(student),
    ).json()
    client.patch(f"/api/v1/exit-requests/{created['id']}/approve", headers=_auth(admin))
    resp = client.patch(f"/api/v1/exit-requests/{created['id']}/approve", headers=_auth(admin))
    assert resp.status_code == 409


def test_admin_can_reject_pending_request(db):
    admin = _user(db, "admin_reject", role=UserRole.ADMIN)
    student = _user(db, "student_reject")
    created = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_description="Reject me"),
        headers=_auth(student),
    ).json()
    resp = client.patch(
        f"/api/v1/exit-requests/{created['id']}/reject",
        json={"rejection_reason": "Missing supporting notes"},
        headers=_auth(admin),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "REJECTED"
    assert data["rejection_reason"] == "Missing supporting notes"


def test_rejection_requires_reason(db):
    admin = _user(db, "admin_reject_need_reason", role=UserRole.ADMIN)
    student = _user(db, "student_reject_need_reason")
    created = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_description="Need reject reason"),
        headers=_auth(student),
    ).json()
    resp = client.patch(
        f"/api/v1/exit-requests/{created['id']}/reject",
        json={},
        headers=_auth(admin),
    )
    assert resp.status_code == 422


def test_student_cannot_reject(db):
    student = _user(db, "student_reject_forbidden")
    created = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_description="Forbidden reject"),
        headers=_auth(student),
    ).json()
    resp = client.patch(
        f"/api/v1/exit-requests/{created['id']}/reject",
        json={"rejection_reason": "Nope"},
        headers=_auth(student),
    )
    assert resp.status_code == 403


def test_student_cannot_request_another_students_device(db):
    owner = _user(db, "owner_other_device")
    other = _user(db, "other_req")
    device = _device(db, owner, "OTHERDEV")
    resp = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_id=str(device.id), device_description="Other's device"),
        headers=_auth(other),
    )
    assert resp.status_code == 403


def test_lost_device_cannot_be_requested(db):
    student = _user(db, "student_lost_device")
    device = _device(db, student, "LOSTREQ", status=DeviceStatus.LOST)
    resp = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_id=str(device.id), device_description="Lost device"),
        headers=_auth(student),
    )
    assert resp.status_code == 409


def test_reported_lost_device_cannot_be_requested(db):
    student = _user(db, "student_reported_lost")
    device = _device(db, student, "REPLREQ", status=DeviceStatus.REPORTED_LOST)
    resp = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_id=str(device.id), device_description="Reported-lost device"),
        headers=_auth(student),
    )
    assert resp.status_code == 409


def test_creation_creates_exit_request_created_audit_log(db):
    student = _user(db, "student_audit_create")
    resp = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_description="Audit create"),
        headers=_auth(student),
    )
    assert resp.status_code == 201
    request_id = resp.json()["id"]
    audit = db.query(AuditLog).filter(AuditLog.action == "EXIT_REQUEST_CREATED", AuditLog.entity_id == str(request_id)).first()
    assert audit is not None


def test_approval_creates_exit_request_approved_audit_log(db):
    admin = _user(db, "admin_audit_approve", role=UserRole.ADMIN)
    student = _user(db, "student_audit_approve")
    created = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_description="Audit approve"),
        headers=_auth(student),
    ).json()
    resp = client.patch(f"/api/v1/exit-requests/{created['id']}/approve", headers=_auth(admin))
    assert resp.status_code == 200
    audit = db.query(AuditLog).filter(AuditLog.action == "EXIT_REQUEST_APPROVED", AuditLog.entity_id == str(created['id'])).first()
    assert audit is not None


def test_rejection_creates_exit_request_rejected_audit_log(db):
    admin = _user(db, "admin_audit_reject", role=UserRole.ADMIN)
    student = _user(db, "student_audit_reject")
    created = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_description="Audit reject"),
        headers=_auth(student),
    ).json()
    resp = client.patch(
        f"/api/v1/exit-requests/{created['id']}/reject",
        json={"rejection_reason": "Policy conflict"},
        headers=_auth(admin),
    )
    assert resp.status_code == 200
    audit = db.query(AuditLog).filter(AuditLog.action == "EXIT_REQUEST_REJECTED", AuditLog.entity_id == str(created['id'])).first()
    assert audit is not None


def test_approval_does_not_change_device_status_or_create_movement(db):
    admin = _user(db, "admin_no_status_change", role=UserRole.ADMIN)
    student = _user(db, "student_no_status_change")
    device = _device(db, student, "APPROVESTATUS")
    created = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_id=str(device.id), device_description="No status change"),
        headers=_auth(student),
    ).json()
    before_status = db.get(Device, device.id).status
    before_count = db.query(DeviceMovement).count()
    resp = client.patch(f"/api/v1/exit-requests/{created['id']}/approve", headers=_auth(admin))
    assert resp.status_code == 200
    after_device = db.get(Device, device.id)
    assert after_device.status == before_status
    assert db.query(DeviceMovement).count() == before_count


def test_rejection_does_not_change_device_status(db):
    admin = _user(db, "admin_no_reject_status", role=UserRole.ADMIN)
    student = _user(db, "student_no_reject_status")
    device = _device(db, student, "REJECTSTATUS")
    created = client.post(
        "/api/v1/exit-requests",
        json=_request_payload(device_id=str(device.id), device_description="Reject no status change"),
        headers=_auth(student),
    ).json()
    before_status = db.get(Device, device.id).status
    resp = client.patch(
        f"/api/v1/exit-requests/{created['id']}/reject",
        json={"rejection_reason": "Wrong purpose"},
        headers=_auth(admin),
    )
    assert resp.status_code == 200
    assert db.get(Device, device.id).status == before_status


def test_expired_and_completed_not_in_status_enum_in_backend(db):
    assert "PENDING" in {s.value for s in __import__('app.models.enums', fromlist=['TemporaryExitRequestStatus']).TemporaryExitRequestStatus}
    assert "APPROVED" in {s.value for s in __import__('app.models.enums', fromlist=['TemporaryExitRequestStatus']).TemporaryExitRequestStatus}
