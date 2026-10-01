import uuid
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.models.visit import Visit
from app.schemas.visitor import VisitActionRequest, VisitCreateRequest, VisitRead
from app.services.visitor_service import (
    approve_visit,
    checkin_visit,
    checkout_visit,
    create_visit,
    reject_visit,
)

router = APIRouter(prefix="/visits", tags=["visits"])


# ---------------------------------------------------------------------------
# Role guards
# ---------------------------------------------------------------------------

def _require_create_role(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role not in (UserRole.STUDENT, UserRole.STAFF, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return user


def _require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrators only")
    return user


def _require_officer(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role != UserRole.GATE_OFFICER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Gate officers only")
    return user


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=VisitRead, status_code=status.HTTP_201_CREATED)
def create(
    body: VisitCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    actor: Annotated[User, Depends(_require_create_role)],
):
    return create_visit(db, body, actor)


@router.get("/{visit_id}", response_model=VisitRead)
def get_visit(
    visit_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    visit = db.get(Visit, visit_id)
    if visit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    return visit


@router.post("/{visit_id}/approve", response_model=VisitRead)
def approve(
    visit_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    actor: Annotated[User, Depends(_require_admin)],
):
    return approve_visit(db, visit_id, actor)


@router.post("/{visit_id}/reject", response_model=VisitRead)
def reject(
    visit_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    actor: Annotated[User, Depends(_require_admin)],
):
    return reject_visit(db, visit_id, actor)


@router.post("/{visit_id}/check-in", response_model=VisitRead)
def check_in(
    visit_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    officer: Annotated[User, Depends(_require_officer)],
    body: VisitActionRequest = Body(default=VisitActionRequest()),
):
    return checkin_visit(db, visit_id, officer)


@router.post("/{visit_id}/check-out", response_model=VisitRead)
def check_out(
    visit_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    officer: Annotated[User, Depends(_require_officer)],
    body: VisitActionRequest = Body(default=VisitActionRequest()),
):
    return checkout_visit(db, visit_id, officer)
