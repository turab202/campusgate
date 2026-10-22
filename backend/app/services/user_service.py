from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserCreate


def _build_user(data: UserCreate) -> User:
    return User(
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        department=data.department,
        password_hash=hash_password(data.password_hash),
        role=data.role,
        campus_id=data.campus_id,
    )


def create_users(db: Session, users_data: list[UserCreate]) -> list[User]:
    """Create users together, hashing their passwords and committing atomically."""
    users = [_build_user(data) for data in users_data]
    db.add_all(users)
    db.commit()
    for user in users:
        db.refresh(user)
    return users


def create_user(db: Session, data: UserCreate) -> User:
    """Create a user with a securely hashed password.

    `data.password_hash` is treated as the plaintext password at creation time
    and is hashed before storage.
    """
    return create_users(db, [data])[0]


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Return the User if credentials are valid and the account is active, else None."""
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None
    return user
