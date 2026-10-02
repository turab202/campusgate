import uuid
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.device import Device
from app.models.enums import DeviceStatus, UserRole
from app.models.user import User
from app.schemas.device import DeviceEnrollRequest, DeviceRead
from app.schemas.device_movement import CheckMovementRequest, MovementResponse
from app.services.device_service import check_in_device, check_out_device, enroll_device

router = APIRouter(prefix="/devices", tags=["devices"])

_LIST_LIMIT = 100


def _require_enroll_role(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role not in (UserRole.STUDENT, UserRole.STAFF, UserRole.GATE_OFFICER, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return user


def _require_officer(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role != UserRole.GATE_OFFICER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Gate officers only")
    return user


@router.get("", response_model=list[DeviceRead], summary="List/search devices")
def list_devices(
    serial: str | None = Query(None, description="Exact serial number lookup"),
    asset_id: str | None = Query(None, description="Exact asset ID lookup"),
    owner_id: uuid.UUID | None = Query(None, description="Filter by owner UUID"),
    device_status: DeviceStatus | None = Query(None, alias="status", description="Filter by device status"),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """
    RBAC rules:
    - STUDENT/STAFF: only their own devices (owner_id filter forced to self).
    - GATE_OFFICER/ADMIN: any device, all filters available.
    """
    q = select(Device)

    # Enforce ownership for students/staff
    if actor.role in (UserRole.STUDENT, UserRole.STAFF):
        q = q.where(Device.owner_id == actor.id)
    elif owner_id is not None:
        q = q.where(Device.owner_id == owner_id)

    if serial is not None:
        q = q.where(Device.serial_number == serial.strip())
    if asset_id is not None:
        q = q.where(Device.asset_id == asset_id.strip())
    if device_status is not None:
        q = q.where(Device.status == device_status)

    q = q.limit(_LIST_LIMIT)
    return db.execute(q).scalars().all()


@router.post("", response_model=DeviceRead, status_code=status.HTTP_201_CREATED)
def enroll(
    body: DeviceEnrollRequest,
    db: Annotated[Session, Depends(get_db)],
    actor: Annotated[User, Depends(_require_enroll_role)],
):
    return enroll_device(db, body, actor)


@router.get("/{device_id}", response_model=DeviceRead)
def get_device(
    device_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    device = db.get(Device, device_id)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return device


@router.post("/{device_id}/check-out", response_model=MovementResponse)
def check_out(
    device_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    officer: Annotated[User, Depends(_require_officer)],
    body: CheckMovementRequest = Body(default=CheckMovementRequest()),
):
    return check_out_device(db, device_id, officer, body.notes)


@router.post("/{device_id}/check-in", response_model=MovementResponse)
def check_in(
    device_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    officer: Annotated[User, Depends(_require_officer)],
    body: CheckMovementRequest = Body(default=CheckMovementRequest()),
):
    return check_in_device(db, device_id, officer, body.notes)
