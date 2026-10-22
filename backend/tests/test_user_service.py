from unittest.mock import Mock

from app.core.security import verify_password
from app.models.enums import UserRole
from app.schemas.user import UserCreate
from app.services.user_service import create_users


def test_create_users_hashes_passwords_and_commits_once():
    db = Mock()
    account_data = [
        UserCreate(
            full_name="Gate Officer",
            email="gate@example.com",
            password_hash="A-long-test-password-1!",
            role=UserRole.GATE_OFFICER,
        ),
        UserCreate(
            full_name="Administrator",
            email="admin@example.com",
            password_hash="A-long-test-password-2!",
            role=UserRole.ADMIN,
        ),
    ]

    users = create_users(db, account_data)

    assert len(users) == 2
    assert users[0].password_hash != account_data[0].password_hash
    assert verify_password(account_data[0].password_hash, users[0].password_hash)
    assert verify_password(account_data[1].password_hash, users[1].password_hash)
    db.add_all.assert_called_once_with(users)
    db.commit.assert_called_once_with()
    assert db.refresh.call_count == 2
