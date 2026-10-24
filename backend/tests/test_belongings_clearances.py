import uuid
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from app.core.security import create_access_token
from app.db.session import get_db
from app.main import app
from app.models.audit_log import AuditLog
from app.models.belongings_clearance import BelongingsExitClearance
from app.db.base import Base
from app.models.gate import Gate
from app.models.gate_assignment import GateAssignment
from app.models.incident import Incident
from app.models.user import User
from app.models.enums import UserRole

client = TestClient(app)


@pytest.fixture(scope="module")
def db_engine():
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _record):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture()
def db(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(
        bind=connection,
        join_transaction_mode="create_savepoint",
        expire_on_commit=False,
    )()
    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = lambda: session
    yield session
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous_overrides)
    session.close()
    transaction.rollback()
    connection.close()


def make_user(db, role: UserRole, *, department: str = "Engineering", active: bool = True) -> User:
    user = User(
        full_name=f"{role.value.title()} {uuid.uuid4().hex[:8]}",
        email=f"{uuid.uuid4().hex}@example.edu",
        password_hash="test-hash",
        role=role,
        department=department,
        campus_id=f"CG-{uuid.uuid4().hex[:10].upper()}",
        is_active=active,
    )
    db.add(user)
    db.flush()
    return user


def auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id, user.role.value)}"}


def request_payload(**overrides):
    payload = {
        "submission_key": str(uuid.uuid4()),
        "dormitory": "North Residence",
        "room_number": "B-204",
        "intended_exit_at": (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat(),
        "remarks": "Leaving for the weekend.",
        "items": [
            {"item_name": "T-shirts", "quantity": 3},
            {"item_name": "Shoes", "quantity": 1},
        ],
    }
    payload.update(overrides)
    return payload


def make_active_gate_assignment(db, officer: User) -> Gate:
    gate = Gate(name=f"Gate {uuid.uuid4().hex[:6]}", code=f"G-{uuid.uuid4().hex[:8]}")
    db.add(gate)
    db.flush()
    db.add(
        GateAssignment(
            officer_id=officer.id,
            gate_id=gate.id,
            start_time=datetime.now(timezone.utc) - timedelta(minutes=5),
            is_active=True,
        )
    )
    db.flush()
    return gate


def create_request(student: User, *, payload: dict | None = None):
    return client.post(
        "/api/v1/belongings-clearances",
        json=payload or request_payload(),
        headers=auth(student),
    )


def test_admin_can_create_proctor_account_and_account_has_no_hash(db):
    admin = make_user(db, UserRole.ADMIN)
    password = "a-very-strong-password-123"
    email = f"{uuid.uuid4().hex}@example.edu"
    response = client.post(
        "/api/v1/users/managed",
        json={
            "full_name": "Department Proctor",
            "email": email,
            "password": password,
            "role": "PROCTOR",
            "phone": "+1-555-0100",
            "department": "Engineering",
        },
        headers=auth(admin),
    )

    assert response.status_code == 201
    assert response.json()["role"] == "PROCTOR"
    assert response.json()["department"] == "Engineering"
    assert response.json()["phone"] == "+1-555-0100"
    assert "password_hash" not in response.text
    assert "password" not in response.json()
    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    assert login.json()["role"] == "PROCTOR"
    proctor_access = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.get("/api/v1/belongings-clearances/proctor", headers=proctor_access).status_code == 200


def test_students_cannot_create_privileged_accounts_or_access_proctor_routes(db):
    student = make_user(db, UserRole.STUDENT)
    create_response = client.post(
        "/api/v1/users/managed",
        json={
            "full_name": "Self Promoted",
            "email": f"{uuid.uuid4().hex}@example.edu",
            "password": "a-very-strong-password-123",
            "role": "PROCTOR",
            "department": "Engineering",
        },
        headers=auth(student),
    )
    proctor_response = client.get(
        "/api/v1/belongings-clearances/proctor",
        headers=auth(student),
    )

    assert create_response.status_code == 403
    assert proctor_response.status_code == 403
    for role in (UserRole.GATE_OFFICER, UserRole.PROCTOR):
        non_admin = make_user(db, role)
        denied = client.get("/api/v1/users/managed", headers=auth(non_admin))
        assert denied.status_code == 403
        promote = client.post(
            "/api/v1/users/managed",
            json={
                "full_name": "Unauthorized Privileged Account",
                "email": f"{uuid.uuid4().hex}@example.edu",
                "password": "a-very-strong-password-123",
                "role": "ADMIN",
            },
            headers=auth(non_admin),
        )
        assert promote.status_code == 403


def test_proctor_creation_requires_a_department_and_public_registration_cannot_grant_role(db):
    admin = make_user(db, UserRole.ADMIN)
    missing_department = client.post(
        "/api/v1/users/managed",
        json={
            "full_name": "Unassigned Proctor",
            "email": f"{uuid.uuid4().hex}@example.edu",
            "password": "a-very-strong-password-123",
            "role": "PROCTOR",
        },
        headers=auth(admin),
    )
    public_registration = client.post(
        "/api/v1/users",
        json={
            "full_name": "Self Promoted",
            "campus_id": f"CG-{uuid.uuid4().hex[:10]}",
            "department": "Engineering",
            "email": f"{uuid.uuid4().hex}@example.edu",
            "password": "StudentPass123!",
            "role": "PROCTOR",
        },
    )

    assert missing_department.status_code == 422
    assert public_registration.status_code == 422


def test_student_creates_private_request_and_proctor_decision_issues_pass(db):
    student = make_user(db, UserRole.STUDENT)
    other_student = make_user(db, UserRole.STUDENT)
    proctor = make_user(db, UserRole.PROCTOR)

    created = create_request(student, payload=request_payload(student_id=str(other_student.id)))
    assert created.status_code == 201
    request_data = created.json()
    assert request_data["student_id"] == str(student.id)
    assert request_data["student_campus_id"] == student.campus_id
    assert len(request_data["items"]) == 2
    assert request_data["status"] == "PENDING"
    assert request_data["pass_token"] is None

    forbidden = client.get(
        f"/api/v1/belongings-clearances/student/{request_data['id']}",
        headers=auth(other_student),
    )
    self_approval = client.post(
        f"/api/v1/belongings-clearances/proctor/{request_data['id']}/approve",
        headers=auth(student),
    )
    approved = client.post(
        f"/api/v1/belongings-clearances/proctor/{request_data['id']}/approve",
        headers=auth(proctor),
    )
    duplicate_approval = client.post(
        f"/api/v1/belongings-clearances/proctor/{request_data['id']}/approve",
        headers=auth(proctor),
    )
    student_view = client.get(
        f"/api/v1/belongings-clearances/student/{request_data['id']}",
        headers=auth(student),
    )

    assert forbidden.status_code == 404
    assert self_approval.status_code == 403
    assert approved.status_code == 200
    assert duplicate_approval.status_code == 409
    assert approved.json()["status"] == "APPROVED"
    assert approved.json()["decided_by_id"] == str(proctor.id)
    assert approved.json()["pass_token"] is None
    assert student_view.status_code == 200
    assert student_view.json()["pass_state"] == "ACTIVE"
    assert student_view.json()["pass_token"].startswith("CGC1.")


def test_student_request_submission_key_makes_retries_idempotent(db):
    student = make_user(db, UserRole.STUDENT)
    payload = request_payload()
    first = create_request(student, payload=payload)
    retry = create_request(
        student,
        payload={**payload, "dormitory": "Different value from a retried payload"},
    )

    assert first.status_code == retry.status_code == 201
    assert retry.json()["id"] == first.json()["id"]
    assert retry.json()["dormitory"] == "North Residence"


def test_proctor_scope_rejects_another_department_and_reject_reason_is_required(db):
    student = make_user(db, UserRole.STUDENT)
    other_proctor = make_user(db, UserRole.PROCTOR, department="Arts")
    created = create_request(student)
    clearance_id = created.json()["id"]

    get_out_of_scope = client.get(
        f"/api/v1/belongings-clearances/proctor/{clearance_id}",
        headers=auth(other_proctor),
    )
    approve_out_of_scope = client.post(
        f"/api/v1/belongings-clearances/proctor/{clearance_id}/approve",
        headers=auth(other_proctor),
    )

    assert get_out_of_scope.status_code == 404
    assert approve_out_of_scope.status_code == 404

    proctor = make_user(db, UserRole.PROCTOR)
    rejected = client.post(
        f"/api/v1/belongings-clearances/proctor/{clearance_id}/reject",
        json={"reason": " "},
        headers=auth(proctor),
    )
    assert rejected.status_code == 422
    rejected = client.post(
        f"/api/v1/belongings-clearances/proctor/{clearance_id}/reject",
        json={"reason": "Please correct the quantities."},
        headers=auth(proctor),
    )
    assert rejected.status_code == 200
    assert rejected.json()["decision_reason"] == "Please correct the quantities."
    assert rejected.json()["pass_state"] == "REJECTED"
    assert client.post(
        f"/api/v1/belongings-clearances/proctor/{clearance_id}/approve",
        headers=auth(proctor),
    ).status_code == 409


@pytest.mark.parametrize(
    "items",
    [
        [],
        [{"item_name": "Shoes", "quantity": 0}],
        [{"item_name": " ", "quantity": 2}],
    ],
)
def test_invalid_belongings_declarations_are_rejected(db, items):
    student = make_user(db, UserRole.STUDENT)
    response = create_request(student, payload=request_payload(items=items))
    assert response.status_code == 422


def test_pending_request_can_be_cancelled_but_approved_request_cannot_be_changed(db):
    student = make_user(db, UserRole.STUDENT)
    proctor = make_user(db, UserRole.PROCTOR)
    pending = create_request(student).json()
    cancelled = client.post(
        f"/api/v1/belongings-clearances/{pending['id']}/cancel",
        json={"reason": "Plans changed."},
        headers=auth(student),
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "CANCELLED"

    approved_request = create_request(student).json()
    client.post(
        f"/api/v1/belongings-clearances/proctor/{approved_request['id']}/approve",
        headers=auth(proctor),
    )
    cancel_approved = client.post(
        f"/api/v1/belongings-clearances/{approved_request['id']}/cancel",
        json={},
        headers=auth(student),
    )
    assert cancel_approved.status_code == 409


def test_gate_lookup_does_not_consume_pass_and_exit_is_single_use_and_audited(db):
    student = make_user(db, UserRole.STUDENT)
    proctor = make_user(db, UserRole.PROCTOR)
    officer = make_user(db, UserRole.GATE_OFFICER)
    gate = make_active_gate_assignment(db, officer)
    created = create_request(student).json()
    client.post(
        f"/api/v1/belongings-clearances/proctor/{created['id']}/approve",
        headers=auth(proctor),
    )
    pass_view = client.get(
        f"/api/v1/belongings-clearances/student/{created['id']}",
        headers=auth(student),
    ).json()
    lookup_body = {"token": pass_view["pass_token"]}

    lookup = client.post(
        "/api/v1/belongings-clearances/gate/validate",
        json=lookup_body,
        headers=auth(officer),
    )
    stored = db.get(BelongingsExitClearance, uuid.UUID(created["id"]))
    assert lookup.status_code == 200
    assert lookup.json()["is_valid"] is True
    assert stored.pass_used_at is None

    exited = client.post(
        "/api/v1/belongings-clearances/gate/exit",
        json={**lookup_body, "identity_verified": True},
        headers=auth(officer),
    )
    assert exited.status_code == 200
    assert exited.json()["pass_state"] == "USED"
    assert exited.json()["exit_gate_id"] == str(gate.id)
    assert exited.json()["exit_officer_id"] == str(officer.id)
    assert exited.json()["exit_identity_verified"] is True

    replay = client.post(
        "/api/v1/belongings-clearances/gate/exit",
        json={**lookup_body, "identity_verified": True},
        headers=auth(officer),
    )
    assert replay.status_code == 409
    assert db.execute(
        select(AuditLog).where(
            AuditLog.entity_id == created["id"],
            AuditLog.action == "BELONGINGS_CLEARANCE_EXIT_RECORDED",
        )
    ).scalar_one_or_none() is not None


def test_expired_and_forged_passes_are_not_accepted(db):
    student = make_user(db, UserRole.STUDENT)
    proctor = make_user(db, UserRole.PROCTOR)
    officer = make_user(db, UserRole.GATE_OFFICER)
    make_active_gate_assignment(db, officer)
    created = create_request(student).json()
    client.post(
        f"/api/v1/belongings-clearances/proctor/{created['id']}/approve",
        headers=auth(proctor),
    )
    pass_view = client.get(
        f"/api/v1/belongings-clearances/student/{created['id']}",
        headers=auth(student),
    ).json()
    token = pass_view["pass_token"]
    forged = token[:-1] + ("0" if token[-1] != "0" else "1")
    forged_response = client.post(
        "/api/v1/belongings-clearances/gate/validate",
        json={"token": forged},
        headers=auth(officer),
    )
    assert forged_response.status_code == 404

    clearance = db.get(BelongingsExitClearance, uuid.UUID(created["id"]))
    clearance.pass_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.commit()
    expired = client.post(
        "/api/v1/belongings-clearances/gate/validate",
        json={"token": token},
        headers=auth(officer),
    )
    attempted_exit = client.post(
        "/api/v1/belongings-clearances/gate/exit",
        json={"token": token, "identity_verified": True},
        headers=auth(officer),
    )

    assert expired.status_code == 200
    assert expired.json()["is_valid"] is False
    assert expired.json()["clearance"]["pass_state"] == "EXPIRED"
    assert attempted_exit.status_code == 409
    assert clearance.pass_used_at is None


def test_rejected_request_reference_is_not_a_usable_gate_pass(db):
    student = make_user(db, UserRole.STUDENT)
    proctor = make_user(db, UserRole.PROCTOR)
    officer = make_user(db, UserRole.GATE_OFFICER)
    make_active_gate_assignment(db, officer)
    created = create_request(student).json()
    rejected = client.post(
        f"/api/v1/belongings-clearances/proctor/{created['id']}/reject",
        json={"reason": "Please correct the declaration."},
        headers=auth(proctor),
    )
    lookup = client.post(
        "/api/v1/belongings-clearances/gate/validate",
        json={"reference": created["reference"]},
        headers=auth(officer),
    )
    exit_attempt = client.post(
        "/api/v1/belongings-clearances/gate/exit",
        json={"reference": created["reference"], "identity_verified": True},
        headers=auth(officer),
    )

    assert rejected.status_code == 200
    assert lookup.status_code == 200
    assert lookup.json()["is_valid"] is False
    assert lookup.json()["clearance"]["pass_state"] == "REJECTED"
    assert exit_attempt.status_code == 409


def test_discrepancy_revokes_pass_and_creates_incident_without_exit(db):
    student = make_user(db, UserRole.STUDENT)
    proctor = make_user(db, UserRole.PROCTOR)
    officer = make_user(db, UserRole.GATE_OFFICER)
    make_active_gate_assignment(db, officer)
    created = create_request(student).json()
    client.post(
        f"/api/v1/belongings-clearances/proctor/{created['id']}/approve",
        headers=auth(proctor),
    )
    pass_view = client.get(
        f"/api/v1/belongings-clearances/student/{created['id']}",
        headers=auth(student),
    ).json()
    response = client.post(
        "/api/v1/belongings-clearances/gate/discrepancy",
        json={"token": pass_view["pass_token"], "reason": "Declared quantity does not match."},
        headers=auth(officer),
    )

    assert response.status_code == 200
    assert response.json()["pass_state"] == "REVOKED"
    assert response.json()["exit_recorded_at"] is None
    assert db.execute(select(Incident).where(Incident.reported_by == officer.id)).scalar_one_or_none()


def test_deactivated_proctor_cannot_use_protected_endpoints(db):
    proctor = make_user(db, UserRole.PROCTOR, active=False)
    response = client.get(
        "/api/v1/belongings-clearances/proctor",
        headers=auth(proctor),
    )
    assert response.status_code == 403
