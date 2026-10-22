import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import CurrentUser
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import BootstrapRequest, LoginRequest, MeResponse, TokenResponse
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
