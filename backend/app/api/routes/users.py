"""
GET /api/v1/users?search=
GATE_OFFICER and ADMIN only. Returns safe public fields — never password_hash.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User

router = APIRouter(prefix="/users", tags=["users"])

_SEARCH_LIMIT = 20


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
