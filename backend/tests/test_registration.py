import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import verify_password
from app.db.session import get_db
from app.main import app
from app.models.enums import UserRole
from app.models.user import User

client = TestClient(app)


@pytest.fixture(scope="module")
def db_engine():
    try:
        engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        yield engine
        engine.dispose()
    except Exception:
        pytest.skip("PostgreSQL not available")


@pytest.fixture()
def db(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection, join_transaction_mode="create_savepoint")()
    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = lambda: session
    yield session
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous_overrides)
    session.close()
    transaction.rollback()
    connection.close()


def _registration_payload(**overrides):
    payload = {
        "full_name": "Registration Test User",
        "campus_id": f"REG-{uuid.uuid4().hex[:12]}",
        "department": "Software Engineering",
        "email": f"register-{uuid.uuid4().hex}@example.edu",
        "phone": "+251911000000",
        "password": "Registration123!",
        "role": "STUDENT",
    }
    payload.update(overrides)
    return payload


def test_student_registration_succeeds(db):
    response = client.post("/api/v1/users", json=_registration_payload())

    assert response.status_code == 201
    assert response.json()["role"] == UserRole.STUDENT.value
    assert response.json()["department"] == "Software Engineering"


def test_staff_registration_succeeds(db):
    response = client.post("/api/v1/users", json=_registration_payload(role="STAFF"))

    assert response.status_code == 201
    assert response.json()["role"] == UserRole.STAFF.value


def test_duplicate_email_rejected(db):
    payload = _registration_payload()
    assert client.post("/api/v1/users", json=payload).status_code == 201

    response = client.post("/api/v1/users", json=_registration_payload(email=payload["email"].upper()))

    assert response.status_code == 409
    assert response.json()["detail"] == "Email is already registered"


def test_duplicate_campus_id_rejected_case_insensitively(db):
    payload = _registration_payload()
    assert client.post("/api/v1/users", json=payload).status_code == 201

    response = client.post("/api/v1/users", json=_registration_payload(campus_id=payload["campus_id"].lower()))

    assert response.status_code == 409
    assert response.json()["detail"] == "Campus ID is already registered"


@pytest.mark.parametrize("role", ["GATE_OFFICER", "ADMIN"])
def test_privileged_public_roles_rejected(db, role):
    response = client.post("/api/v1/users", json=_registration_payload(role=role))

    assert response.status_code == 422


def test_registration_hashes_password_and_never_returns_hash(db):
    payload = _registration_payload()

    response = client.post("/api/v1/users", json=payload)

    assert response.status_code == 201
    assert "password" not in response.json()
    assert "password_hash" not in response.text
    user = db.query(User).filter(User.campus_id == payload["campus_id"]).one()
    assert user.password_hash != payload["password"]
    assert verify_password(payload["password"], user.password_hash)


@pytest.mark.parametrize(
    "missing_field",
    ["full_name", "campus_id", "department", "email", "password", "role"],
)
def test_registration_required_fields_rejected(db, missing_field):
    payload = _registration_payload()
    del payload[missing_field]

    response = client.post("/api/v1/users", json=payload)

    assert response.status_code == 422


def test_student_can_log_in_after_registration(db):
    payload = _registration_payload()
    assert client.post("/api/v1/users", json=payload).status_code == 201

    response = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})

    assert response.status_code == 200
    assert response.json()["role"] == UserRole.STUDENT.value


def test_staff_can_log_in_after_registration(db):
    payload = _registration_payload(role="STAFF")
    assert client.post("/api/v1/users", json=payload).status_code == 201

    response = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})

    assert response.status_code == 200
    assert response.json()["role"] == UserRole.STAFF.value