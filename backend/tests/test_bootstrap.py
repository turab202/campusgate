from unittest.mock import Mock

from fastapi.testclient import TestClient

from app.api.routes import auth as auth_routes
from app.core.config import settings
from app.db.session import get_db
from app.main import app

client = TestClient(app)


def _payload():
    return {
        "office_gate": {
            "full_name": "Gate Officer",
            "email": "gate@example.com",
            "password": "GateOfficerPassword123!",
        },
        "admin": {
            "full_name": "Administrator",
            "email": "admin@example.com",
            "password": "AdminAccountPassword123!",
        },
    }


def test_bootstrap_is_disabled_without_secret(monkeypatch):
    monkeypatch.setattr(settings, "BOOTSTRAP_SECRET", None)

    response = client.post("/api/v1/auth/bootstrap", json=_payload())

    assert response.status_code == 404


def test_bootstrap_rejects_incorrect_secret(monkeypatch):
    monkeypatch.setattr(settings, "BOOTSTRAP_SECRET", "s" * 32)

    response = client.post(
        "/api/v1/auth/bootstrap",
        json=_payload(),
        headers={"X-Bootstrap-Secret": "wrong-secret"},
    )

    assert response.status_code == 401


def test_bootstrap_creates_both_roles_atomically(monkeypatch):
    monkeypatch.setattr(settings, "BOOTSTRAP_SECRET", "s" * 32)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    db = Mock()
    db.execute.return_value.first.return_value = None
    gate_user = Mock(email="gate@example.com")
    gate_user.role.value = "GATE_OFFICER"
    admin_user = Mock(email="admin@example.com")
    admin_user.role.value = "ADMIN"
    create_users = Mock(return_value=[gate_user, admin_user])
    monkeypatch.setattr(auth_routes, "create_users", create_users)
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.post(
            "/api/v1/auth/bootstrap",
            json=_payload(),
            headers={"X-Bootstrap-Secret": "s" * 32},
        )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 201
    assert response.json()["created"] == [
        {"email": "gate@example.com", "role": "GATE_OFFICER"},
        {"email": "admin@example.com", "role": "ADMIN"},
    ]
    create_users.assert_called_once()
    assert [user.role.value for user in create_users.call_args.args[1]] == [
        "GATE_OFFICER",
        "ADMIN",
    ]


def test_bootstrap_closes_when_privileged_account_exists(monkeypatch):
    monkeypatch.setattr(settings, "BOOTSTRAP_SECRET", "s" * 32)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    db = Mock()
    db.execute.return_value.first.return_value = ("existing-user-id",)
    create_users = Mock()
    monkeypatch.setattr(auth_routes, "create_users", create_users)
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.post(
            "/api/v1/auth/bootstrap",
            json=_payload(),
            headers={"X-Bootstrap-Secret": "s" * 32},
        )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 409
    create_users.assert_not_called()
