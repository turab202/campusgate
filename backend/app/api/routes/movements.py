"""
GET /api/v1/devices/{device_id}/movements  — movement history for one device
GET /api/v1/movements                       — admin/officer transaction log with filters
"""
import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.device import Device
from app.models.device_movement import DeviceMovement
from app.models.enums import MovementType, UserRole
from app.models.user import User
from app.schemas.device_movement import DeviceMovementRead

router = APIRouter(tags=["movements"])

_LIST_LIMIT = 200


def _require_officer_or_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role not in (UserRole.GATE_OFFICER, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gate officers and administrators only",
        )
    return user


@router.get(
    "/devices/{device_id}/movements",
    response_model=list[DeviceMovementRead],
    summary="Movement history for a single device",
)
def device_movements(
    device_id: uuid.UUID,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """
    RBAC:
    - STUDENT/STAFF: only their own device's history.
    - GATE_OFFICER/ADMIN: any device.
    """
    device = db.get(Device, device_id)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    if actor.role in (UserRole.STUDENT, UserRole.STAFF) and device.owner_id != actor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only view movement history for your own devices",
        )

    movements = (
        db.execute(
            select(DeviceMovement)
            .where(DeviceMovement.device_id == device_id)
            .order_by(DeviceMovement.occurred_at.desc())
        )
        .scalars()
        .all()
    )
    return movements


@router.get(
    "/movements",
    response_model=list[DeviceMovementRead],
    summary="Transaction log with optional filters",
)
def list_movements(
    device_id: uuid.UUID | None = Query(None),
    gate_id: uuid.UUID | None = Query(None),
    officer_id: uuid.UUID | None = Query(None),
    movement_type: MovementType | None = Query(None),
    from_date: datetime | None = Query(None, description="ISO 8601 datetime"),
    to_date: datetime | None = Query(None, description="ISO 8601 datetime"),
    db: Session = Depends(get_db),
    actor: User = Depends(_require_officer_or_admin),
):
    q = select(DeviceMovement)

    if device_id is not None:
        q = q.where(DeviceMovement.device_id == device_id)
    if gate_id is not None:
        q = q.where(DeviceMovement.gate_id == gate_id)
    if officer_id is not None:
        q = q.where(DeviceMovement.officer_id == officer_id)
    if movement_type is not None:
        q = q.where(DeviceMovement.movement_type == movement_type)
    if from_date is not None:
        q = q.where(DeviceMovement.occurred_at >= from_date)
    if to_date is not None:
        q = q.where(DeviceMovement.occurred_at <= to_date)

    q = q.order_by(DeviceMovement.occurred_at.desc()).limit(_LIST_LIMIT)
    return db.execute(q).scalars().all()
