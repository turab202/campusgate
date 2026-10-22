"""
User registration, privileged account management, and authorized user search.
"""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.core.security import hash_password
from app.models.audit_log import AuditLog
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import (
    ManagedUserCreate,
    ManagedUserUpdate,
    UserCreate,
    UserRegistrationRead,
    UserRegistrationRequest,
)
from app.services.user_service import create_user

router = APIRouter(prefix="/users", tags=["users"])

_SEARCH_LIMIT = 20
_ADMIN_ACCOUNT_LOCK_ID = 731942852


def _require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators only",
        )
    return user


def _managed_user_audit(
    db: Session,
    actor: User,
    user: User,
    action: str,
    description: str,
) -> None:
    db.add(AuditLog(
        actor_id=actor.id,
        action=action,
        entity_type="user",
        entity_id=str(user.id),
        description=description,
    ))


@router.get("/managed", response_model=list[UserRegistrationRead], summary="List managed accounts")
def list_managed_users(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    return db.execute(
        select(User)
        .where(User.role.in_((UserRole.GATE_OFFICER, UserRole.ADMIN)))
        .order_by(User.role, User.full_name)
    ).scalars().all()


@router.post(
    "/managed",
    response_model=UserRegistrationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a gate officer or administrator",
)
def create_managed_user(
    body: ManagedUserCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(_require_admin),
):
    email = str(body.email).strip().lower()
    if db.execute(select(User.id).where(func.lower(User.email) == email)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    if body.campus_id and db.execute(
        select(User.id).where(func.lower(User.campus_id) == body.campus_id.lower())
    ).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Campus ID is already registered")

    try:
        created = User(
            full_name=body.full_name,
            email=email,
            phone=body.phone,
            department=body.department,
            password_hash=hash_password(body.password),
            role=body.role,
            campus_id=body.campus_id.strip() if body.campus_id else None,
        )
        db.add(created)
        db.flush()
        _managed_user_audit(
            db,
            actor,
            created,
            "USER_CREATED",
            f"{created.role.value} account created by administrator.",
        )
        db.commit()
        db.refresh(created)
        return created
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or Campus ID is already registered",
        ) from None


@router.patch(
    "/managed/{user_id}",
    response_model=UserRegistrationRead,
    summary="Update or deactivate a managed account",
)
def update_managed_user(
    user_id: uuid.UUID,
    body: ManagedUserUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(_require_admin),
):
    db.execute(text("SELECT pg_advisory_xact_lock(:lock_id)"), {"lock_id": _ADMIN_ACCOUNT_LOCK_ID})
    user = db.get(User, user_id)
    if user is None or user.role not in (UserRole.GATE_OFFICER, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Managed account not found")

    changes = body.model_dump(exclude_unset=True)
    if user.id == actor.id and (
        changes.get("is_active") is False or changes.get("role", user.role) != UserRole.ADMIN
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You cannot deactivate your own administrator account or change its role",
        )

    next_role = changes.get("role", user.role)
    next_active = changes.get("is_active", user.is_active)
    if user.is_active and user.role == UserRole.ADMIN and (
        next_role != UserRole.ADMIN or not next_active
    ):
        another_active_admin = db.execute(
            select(User.id)
            .where(
                User.role == UserRole.ADMIN,
                User.is_active == True,  # noqa: E712
                User.id != user.id,
            )
            .limit(1)
        ).first()
        if not another_active_admin:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The last active administrator cannot be deactivated or demoted",
            )

    if "email" in changes:
        normalized_email = str(changes["email"]).strip().lower()
        duplicate = db.execute(
            select(User.id).where(
                func.lower(User.email) == normalized_email,
                User.id != user.id,
            )
        ).first()
        if duplicate:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
        changes["email"] = normalized_email

    password = changes.pop("password", None)
    if password is not None:
        changes["password_hash"] = hash_password(password)

    changed_fields = sorted(field for field in changes if field != "password_hash")
    if password is not None:
        changed_fields.append("password")
    action = (
        "USER_DEACTIVATED"
        if changes.get("is_active") is False
        else "USER_REACTIVATED"
        if changes.get("is_active") is True
        else "USER_UPDATED"
    )
    try:
        for field, value in changes.items():
            setattr(user, field, value)
        _managed_user_audit(
            db,
            actor,
            user,
            action,
            f"Managed account fields updated: {', '.join(changed_fields)}.",
        )
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered") from None


@router.post("", response_model=UserRegistrationRead, status_code=status.HTTP_201_CREATED)
def register_user(
    body: UserRegistrationRequest,
    db: Annotated[Session, Depends(get_db)],
):
    email = str(body.email).strip().lower()
    campus_id = body.campus_id.strip()

    if db.execute(select(User.id).where(func.lower(User.email) == email)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    if db.execute(select(User.id).where(func.lower(User.campus_id) == campus_id.lower())).first():
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
        if db.execute(select(User.id).where(func.lower(User.campus_id) == campus_id.lower())).first():
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
