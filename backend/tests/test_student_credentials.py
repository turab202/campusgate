import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.api.routes import auth as auth_routes
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import StudentCredentialUpdate


def _student():
    return User(
        id=uuid.uuid4(),
        full_name="Test Student",
        email="student@example.com",
        password_hash="existing-hash",
        role=UserRole.STUDENT,
        is_active=True,
    )


def _db():
    added = []
    return SimpleNamespace(
        execute=lambda *_args: SimpleNamespace(first=lambda: None),
        add=added.append,
        commit=lambda: None,
        refresh=lambda _user: None,
        rollback=lambda: None,
        added=added,
    )


def test_student_credential_update_requires_at_least_one_change():
    with pytest.raises(ValidationError):
        StudentCredentialUpdate(current_password="current-password")


def test_student_can_update_email_and_password(monkeypatch):
    student = _student()
    db = _db()
    monkeypatch.setattr(auth_routes, "verify_password", lambda password, _hash: password == "current-password")
    monkeypatch.setattr(auth_routes, "hash_password", lambda password: f"hashed:{password}")

    result = auth_routes.update_student_credentials(
        body=StudentCredentialUpdate(
            current_password="current-password",
            email="UPDATED@example.com",
            new_password="new-password-123",
        ),
        current_user=student,
        db=db,
    )

    assert result.email == "updated@example.com"
    assert result.password_hash == "hashed:new-password-123"
    assert len(db.added) == 1
    assert db.added[0].description.endswith("email, password.")


def test_student_credential_update_rejects_wrong_current_password(monkeypatch):
    student = _student()
    monkeypatch.setattr(auth_routes, "verify_password", lambda *_args: False)

    with pytest.raises(HTTPException) as exc:
        auth_routes.update_student_credentials(
            body=StudentCredentialUpdate(
                current_password="wrong-password",
                email="updated@example.com",
            ),
            current_user=student,
            db=_db(),
        )

    assert exc.value.status_code == 400
    assert student.email == "student@example.com"


def test_non_student_cannot_use_student_credential_update(monkeypatch):
    officer = _student()
    officer.role = UserRole.GATE_OFFICER
    monkeypatch.setattr(auth_routes, "verify_password", lambda *_args: True)

    with pytest.raises(HTTPException) as exc:
        auth_routes.update_student_credentials(
            body=StudentCredentialUpdate(
                current_password="current-password",
                email="updated@example.com",
            ),
            current_user=officer,
            db=_db(),
        )

    assert exc.value.status_code == 403
