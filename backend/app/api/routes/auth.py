import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import CurrentUser
from app.core.security import hash_password, verify_password
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import (
    BootstrapRequest,
    LoginRequest,
    MeResponse,
    StudentCredentialUpdate,
    TokenResponse,
)
from app.schemas.user import UserCreate
from app.services.user_service import authenticate_user, create_users

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/bootstrap", status_code=status.HTTP_201_CREATED)
def bootstrap_production_users(
    body: BootstrapRequest,
    bootstrap_secret: str | None = Header(default=None, alias="X-Bootstrap-Secret"),
    db: Session = Depends(get_db),
):
    configured_secret = settings.BOOTSTRAP_SECRET
    if configured_secret is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if bootstrap_secret is None or not secrets.compare_digest(bootstrap_secret, configured_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bootstrap secret")
    if settings.ENVIRONMENT.lower() != "production":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    try:
        db.execute(text("SELECT pg_advisory_xact_lock(731942851)"))
        privileged_user_exists = db.execute(
            select(User.id)
            .where(User.role.in_((UserRole.GATE_OFFICER, UserRole.ADMIN)))
            .limit(1)
        ).first()
        if privileged_user_exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Privileged accounts already exist; bootstrap is closed",
            )

        created = create_users(db, [
            UserCreate(
                full_name=body.office_gate.full_name,
                email=str(body.office_gate.email).lower(),
                password_hash=body.office_gate.password,
                role=UserRole.GATE_OFFICER,
            ),
            UserCreate(
                full_name=body.admin.full_name,
                email=str(body.admin.email).lower(),
                password_hash=body.admin.password,
                role=UserRole.ADMIN,
            ),
        ])
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account email is already registered; no accounts were created",
        ) from None

    return {
        "created": [{"email": user.email, "role": user.role.value} for user in created]
    }


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, body.email, body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(user.id, user.role.value)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        role=user.role,
        full_name=user.full_name,
    )


@router.get("/me", response_model=MeResponse)
def me(current_user: CurrentUser):
    return current_user


@router.patch("/me/credentials", response_model=MeResponse)
def update_student_credentials(
    body: StudentCredentialUpdate,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only student accounts can update credentials here",
        )
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    changed_fields: list[str] = []
    if body.email is not None:
        email = str(body.email).strip().lower()
        duplicate = db.execute(
            select(User.id).where(
                func.lower(User.email) == email,
                User.id != current_user.id,
            )
        ).first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already registered",
            )
        current_user.email = email
        changed_fields.append("email")

    if body.new_password is not None:
        current_user.password_hash = hash_password(body.new_password)
        changed_fields.append("password")

    db.add(AuditLog(
        actor_id=current_user.id,
        action="STUDENT_CREDENTIALS_UPDATED",
        entity_type="user",
        entity_id=str(current_user.id),
        description=f"Student updated credentials: {', '.join(changed_fields)}.",
    ))
    try:
        db.commit()
        db.refresh(current_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        ) from None
    return current_user
