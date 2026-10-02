import uuid
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import UserRole, VisitStatus
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

_LIST_LIMIT = 200


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


def _require_officer_or_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role not in (UserRole.GATE_OFFICER, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Gate officers and administrators only")
    return user


@router.get("", response_model=list[VisitRead], summary="List visits with optional filters")
def list_visits(
    visit_status: VisitStatus | None = Query(None, alias="status"),
    host_user_id: uuid.UUID | None = Query(None),
    visitor_id: uuid.UUID | None = Query(None),
    on_date: date | None = Query(None, description="Filter by expected_start_at date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    actor: User = Depends(_require_officer_or_admin),
):
    """
    GATE_OFFICER and ADMIN can list visits.
    Supports filtering by status, host, visitor, and date.
    """
    q = select(Visit)

    if visit_status is not None:
        q = q.where(Visit.status == visit_status)
    if host_user_id is not None:
        q = q.where(Visit.host_user_id == host_user_id)
    if visitor_id is not None:
        q = q.where(Visit.visitor_id == visitor_id)
    if on_date is not None:
        q = q.where(Visit.expected_start_at >= on_date).where(
            Visit.expected_start_at < on_date + timedelta(days=1)
        )

    q = q.order_by(Visit.created_at.desc()).limit(_LIST_LIMIT)
    return db.execute(q).scalars().all()


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
