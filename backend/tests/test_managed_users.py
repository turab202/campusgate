import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.routes import users as users_routes
from app.core.deps import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import ManagedUserCreate, ManagedUserUpdate

client = TestClient(app)


def test_managed_user_create_rejects_non_privileged_roles():
    with pytest.raises(ValidationError):
        ManagedUserCreate(
            full_name="Student",
            email="student@example.com",
            password="a-strong-password-123",
            role=UserRole.STUDENT,
        )


def test_managed_user_create_requires_strong_password():
    with pytest.raises(ValidationError):
        ManagedUserCreate(
            full_name="Officer",
            email="officer@example.com",
            password="short",
            role=UserRole.GATE_OFFICER,
        )


def test_managed_user_update_requires_at_least_one_field():
    with pytest.raises(ValidationError):
        ManagedUserUpdate()


def test_managed_user_routes_are_admin_only():
    officer = SimpleNamespace(role=UserRole.GATE_OFFICER)
    app.dependency_overrides[get_current_user] = lambda: officer
    app.dependency_overrides[get_db] = lambda: object()

    try:
        response = client.get("/api/v1/users/managed")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403


def test_admin_cannot_deactivate_themselves():
    admin_id = uuid.uuid4()
    admin = User(
        id=admin_id,
        full_name="Administrator",
        email="admin@example.com",
        password_hash="not-used",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db = SimpleNamespace(
        get=lambda _model, _user_id: admin,
        execute=lambda *_args: None,
    )

    with pytest.raises(HTTPException) as exc:
        users_routes.update_managed_user(
            user_id=admin_id,
            body=ManagedUserUpdate(is_active=False),
            db=db,
            actor=admin,
        )

    assert exc.value.status_code == 409


def test_last_active_admin_cannot_be_deactivated():
    target_admin = User(
        id=uuid.uuid4(),
        full_name="Last Administrator",
        email="last-admin@example.com",
        password_hash="not-used",
        role=UserRole.ADMIN,
        is_active=True,
    )
    actor = SimpleNamespace(id=uuid.uuid4(), role=UserRole.ADMIN)
    query_result = SimpleNamespace(first=lambda: None)
    db = SimpleNamespace(
        get=lambda _model, _user_id: target_admin,
        execute=lambda *_args: query_result,
    )

    with pytest.raises(HTTPException) as exc:
        users_routes.update_managed_user(
            user_id=target_admin.id,
            body=ManagedUserUpdate(is_active=False),
            db=db,
            actor=actor,
        )

    assert exc.value.status_code == 409


def test_admin_can_update_managed_user_and_password_is_hashed(monkeypatch):
    target = User(
        id=uuid.uuid4(),
        full_name="Old Officer",
        email="old-officer@example.com",
        password_hash="old-hash",
        role=UserRole.GATE_OFFICER,
        is_active=True,
    )
    actor = SimpleNamespace(id=uuid.uuid4(), role=UserRole.ADMIN)
    query_result = SimpleNamespace(first=lambda: None)
    db = SimpleNamespace(
        get=lambda _model, _user_id: target,
        execute=lambda *_args: query_result,
        add=lambda _item: None,
        commit=lambda: None,
        refresh=lambda _item: None,
    )
    monkeypatch.setattr(users_routes, "hash_password", lambda password: f"hashed:{password}")

    result = users_routes.update_managed_user(
        user_id=target.id,
        body=ManagedUserUpdate(
            full_name="Updated Officer",
            email="UPDATED@example.com",
            password="a-strong-password-123",
        ),
        db=db,
        actor=actor,
    )

    assert result.full_name == "Updated Officer"
    assert result.email == "updated@example.com"
    assert result.password_hash == "hashed:a-strong-password-123"


def test_admin_can_create_managed_user_and_audit_it(monkeypatch):
    actor = SimpleNamespace(id=uuid.uuid4(), role=UserRole.ADMIN)
    query_result = SimpleNamespace(first=lambda: None)
    added = []
    db = SimpleNamespace(
        execute=lambda _query: query_result,
        add=added.append,
        flush=lambda: setattr(created[0], "id", uuid.uuid4()),
        commit=lambda: None,
        refresh=lambda _user: None,
        rollback=lambda: None,
    )
    created = []
    original_user_init = User.__init__

    def track_user(*args, **kwargs):
        original_user_init(*args, **kwargs)
        created.append(args[0])

    monkeypatch.setattr(User, "__init__", track_user)
    monkeypatch.setattr(users_routes, "hash_password", lambda password: f"hashed:{password}")

    result = users_routes.create_managed_user(
        body=ManagedUserCreate(
            full_name="New Officer",
            email="OFFICER@example.com",
            password="a-strong-password-123",
            role=UserRole.GATE_OFFICER,
        ),
        db=db,
        actor=actor,
    )

    assert result.email == "officer@example.com"
    assert result.password_hash == "hashed:a-strong-password-123"
    assert len(added) == 2
    assert added[1].action == "USER_CREATED"
