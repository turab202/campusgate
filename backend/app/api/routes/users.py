"""
GET /api/v1/users?search=
GATE_OFFICER and ADMIN only. Returns safe public fields — never password_hash.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserCreate, UserRegistrationRead, UserRegistrationRequest
from app.services.user_service import create_user

router = APIRouter(prefix="/users", tags=["users"])

_SEARCH_LIMIT = 20


@router.post("", response_model=UserRegistrationRead, status_code=status.HTTP_201_CREATED)
def register_user(
    body: UserRegistrationRequest,
    db: Annotated[Session, Depends(get_db)],
):
    email = str(body.email).strip().lower()
    campus_id = body.campus_id

    if db.execute(select(User.id).where(func.lower(User.email) == email)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    if db.execute(select(User.id).where(func.upper(User.campus_id) == campus_id)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Campus ID is already registered")

    try:
        return create_user(db, UserCreate(
            full_name=body.full_name,
            email=email,
            phone=body.phone,
            department=body.department,
            password_hash=body.password,
            role=body.role,
            campus_id=campus_id,
        ))
    except IntegrityError:
        db.rollback()
        if db.execute(select(User.id).where(func.lower(User.email) == email)).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
        if db.execute(select(User.id).where(func.upper(User.campus_id) == campus_id)).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Campus ID is already registered")
        raise


def _require_officer_or_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role not in (UserRole.GATE_OFFICER, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gate officers and administrators only",
        )
    return user


@router.get("", summary="Search users by campus_id, full_name, or email")
def search_users(
    search: str = Query(..., min_length=1, description="campus_id, full_name, or email fragment"),
    db: Session = Depends(get_db),
    _: User = Depends(_require_officer_or_admin),
) -> list[dict]:
    """
    Returns up to 20 active users matching the search term.
    Only safe public fields are returned — password_hash is never exposed.
    """
    term = f"%{search.strip()}%"
    users = (
        db.query(User)
        .filter(
            User.is_active == True,  # noqa: E712
            or_(
                User.campus_id.ilike(term),
                User.full_name.ilike(term),
                User.email.ilike(term),
            ),
        )
        .limit(_SEARCH_LIMIT)
        .all()
    )
    return [
        {
            "id": str(u.id),
            "campus_id": u.campus_id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role.value,
        }
        for u in users
    ]
