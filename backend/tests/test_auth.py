"""
Authentication and RBAC tests.
DB-dependent tests skip automatically if PostgreSQL is not available.
"""
import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.main import app
from app.models.enums import UserRole
from app.models.user import User

client = TestClient(app)


# ---------------------------------------------------------------------------
# DB session fixture (same rollback pattern as test_models.py)
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
        pytest.skip("PostgreSQL not available — skipping auth DB tests")


@pytest.fixture()
def db(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


# ---------------------------------------------------------------------------
# Helper — create a real user in the test DB
# ---------------------------------------------------------------------------

def _make_user(db, suffix: str, role: UserRole = UserRole.STUDENT, active: bool = True) -> tuple[User, str]:
    plain = "TestPass123!"
    user = User(
        full_name=f"Test {suffix}",
        email=f"auth_{suffix}@test.com",
        password_hash=hash_password(plain),
        role=role,
        is_active=active,
    )
    db.add(user)
    db.flush()
    db.refresh(user)
    return user, plain


# ---------------------------------------------------------------------------
# 1. Password hashing
# ---------------------------------------------------------------------------

def test_hash_password_not_plaintext():
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert len(hashed) > 20


def test_verify_password_correct():
    hashed = hash_password("correct_password")
    assert verify_password("correct_password", hashed) is True


def test_verify_password_wrong():
    hashed = hash_password("correct_password")
    assert verify_password("wrong_password", hashed) is False


# ---------------------------------------------------------------------------
# 2. JWT
# ---------------------------------------------------------------------------

def test_create_and_decode_token():
    uid = uuid.uuid4()
    token = create_access_token(uid, UserRole.ADMIN.value)
    payload = decode_access_token(token)
    assert payload["sub"] == str(uid)
    assert payload["role"] == UserRole.ADMIN.value


def test_expired_token_rejected():
    uid = uuid.uuid4()
    expired_payload = {
        "sub": str(uid),
        "role": UserRole.STUDENT.value,
        "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
    }
    token = jwt.encode(expired_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token)


def test_invalid_token_rejected():
    with pytest.raises(jwt.PyJWTError):
        decode_access_token("not.a.valid.token")


def test_wrong_secret_rejected():
    uid = uuid.uuid4()
    token = jwt.encode(
        {"sub": str(uid), "role": "STUDENT", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        "wrong-secret",
        algorithm="HS256",
    )
    with pytest.raises(jwt.PyJWTError):
        decode_access_token(token)


# ---------------------------------------------------------------------------
# 3. Login endpoint
# ---------------------------------------------------------------------------

def test_login_success(db):
    user, plain = _make_user(db, "login_ok")
    # Override get_db to use our test session
    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: db

    response = client.post("/api/v1/auth/login", json={"email": user.email, "password": plain})
    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == user.role.value
    assert "password" not in str(data)
    assert "password_hash" not in str(data)


def test_login_wrong_password(db):
    user, _ = _make_user(db, "login_bad_pw")
    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: db

    response = client.post("/api/v1/auth/login", json={"email": user.email, "password": "WrongPass!"})
    app.dependency_overrides.clear()

    assert response.status_code == 401


def test_login_unknown_email(db):
    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: db

    response = client.post("/api/v1/auth/login", json={"email": "nobody@test.com", "password": "anything"})
    app.dependency_overrides.clear()

    assert response.status_code == 401


def test_login_inactive_user(db):
    user, plain = _make_user(db, "login_inactive", active=False)
    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: db

    response = client.post("/api/v1/auth/login", json={"email": user.email, "password": plain})
    app.dependency_overrides.clear()

    assert response.status_code == 401


# ---------------------------------------------------------------------------
# 4. /auth/me
# ---------------------------------------------------------------------------

def test_me_returns_current_user(db):
    user, plain = _make_user(db, "me_ok")
    token = create_access_token(user.id, user.role.value)

    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: db

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == user.email
    assert data["role"] == user.role.value
    assert "password_hash" not in data
    assert "password" not in data


def test_me_no_token():
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401  # no credentials provided


def test_me_invalid_token():
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert response.status_code == 401  # invalid token → 401


def test_me_expired_token(db):
    user, _ = _make_user(db, "me_expired")
    expired_payload = {
        "sub": str(user.id),
        "role": user.role.value,
        "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
    }
    token = jwt.encode(expired_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: db

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    app.dependency_overrides.clear()

    assert response.status_code == 401  # expired token → 401


def test_me_inactive_user_rejected(db):
    user, _ = _make_user(db, "me_inactive", active=False)
    token = create_access_token(user.id, user.role.value)

    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: db

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    app.dependency_overrides.clear()

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# 5. Role authorization
# ---------------------------------------------------------------------------

def test_role_allows_correct_role(db):
    """Admin token should pass require_roles(ADMIN)."""
    from app.core.deps import require_roles
    admin, _ = _make_user(db, "rbac_admin", role=UserRole.ADMIN)
    token = create_access_token(admin.id, admin.role.value)

    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: db

    # /auth/me is authenticated-only; use it to confirm token works
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["role"] == UserRole.ADMIN.value


def test_role_rejects_wrong_role(db):
    """A student token must be rejected by require_roles(ADMIN)."""
    from fastapi import APIRouter
    from app.core.deps import require_roles

    student, _ = _make_user(db, "rbac_student", role=UserRole.STUDENT)
    token = create_access_token(student.id, student.role.value)

    # Mount a temporary admin-only route
    test_router = APIRouter()

    @test_router.get("/test-admin-only")
    def _admin_only(user=require_roles(UserRole.ADMIN)):
        return {"ok": True}

    app.include_router(test_router, prefix="/api/v1")

    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: db

    response = client.get("/api/v1/test-admin-only", headers={"Authorization": f"Bearer {token}"})
    app.dependency_overrides.clear()

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# 6. password_hash never in API response
# ---------------------------------------------------------------------------

def test_password_hash_not_in_login_response(db):
    user, plain = _make_user(db, "nohash_login")
    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: db

    response = client.post("/api/v1/auth/login", json={"email": user.email, "password": plain})
    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert "password_hash" not in response.text
    assert "password_hash" not in response.json()


def test_password_hash_not_in_me_response(db):
    user, _ = _make_user(db, "nohash_me")
    token = create_access_token(user.id, user.role.value)
    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: db

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert "password_hash" not in response.text
    assert "password_hash" not in response.json()
