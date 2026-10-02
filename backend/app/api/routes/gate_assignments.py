"""
GET  /api/v1/gate-assignments  — Admin only.
POST /api/v1/gate-assignments  — Admin only.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.gate import Gate
from app.models.gate_assignment import GateAssignment
from app.models.user import User
from app.schemas.gate_assignment import GateAssignmentCreate, GateAssignmentRead

router = APIRouter(prefix="/gate-assignments", tags=["gate-assignments"])


def _require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrators only",
        )
    return user


@router.get("", response_model=list[GateAssignmentRead], summary="List gate assignments")
def list_assignments(
    officer_id: str | None = Query(None),
    gate_id: str | None = Query(None),
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    q = select(GateAssignment)
    if officer_id is not None:
        q = q.where(GateAssignment.officer_id == officer_id)
    if gate_id is not None:
        q = q.where(GateAssignment.gate_id == gate_id)
    if active_only:
        q = q.where(GateAssignment.is_active == True)  # noqa: E712
    q = q.order_by(GateAssignment.created_at.desc())
    return db.execute(q).scalars().all()


@router.post("", response_model=GateAssignmentRead, status_code=status.HTTP_201_CREATED, summary="Create gate assignment")
def create_assignment(
    body: GateAssignmentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    # Validate officer exists and has GATE_OFFICER role
    officer = db.get(User, body.officer_id)
    if officer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Officer not found")
    if officer.role != UserRole.GATE_OFFICER:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="User is not a GATE_OFFICER",
        )
    if not officer.is_active:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Officer account is inactive",
        )

    # Validate gate exists and is active
    gate = db.get(Gate, body.gate_id)
    if gate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gate not found")
    if not gate.is_active:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Gate is inactive",
        )

    # Validate time range
    if body.end_time is not None and body.end_time <= body.start_time:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_time must be after start_time",
        )

    # Check for overlapping active assignments for this officer
    existing = (
        db.execute(
            select(GateAssignment).where(
                GateAssignment.officer_id == body.officer_id,
                GateAssignment.is_active == True,  # noqa: E712
            )
        )
        .scalars()
        .all()
    )

    new_end = body.end_time
    for a in existing:
        # Overlap: new starts before existing ends AND new ends after existing starts
        a_end = a.end_time
        new_starts_before_a_ends = (a_end is None) or (body.start_time < a_end)
        new_ends_after_a_starts = (new_end is None) or (new_end > a.start_time)
        if new_starts_before_a_ends and new_ends_after_a_starts:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Officer already has an overlapping active gate assignment",
            )

    assignment = GateAssignment(
        officer_id=body.officer_id,
        gate_id=body.gate_id,
        start_time=body.start_time,
        end_time=body.end_time,
        is_active=True,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment
