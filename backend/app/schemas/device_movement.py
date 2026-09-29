import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import DeviceStatus, DeviceType, MovementType


class DeviceMovementCreate(BaseModel):
    device_id: uuid.UUID
    officer_id: uuid.UUID
    gate_id: uuid.UUID
    movement_type: MovementType
    occurred_at: datetime | None = None
    notes: str | None = None


class DeviceMovementRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    device_id: uuid.UUID
    officer_id: uuid.UUID
    gate_id: uuid.UUID
    movement_type: MovementType
    occurred_at: datetime
    notes: str | None
    created_at: datetime


class MovementDeviceInfo(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    asset_id: str
    serial_number: str
    device_type: DeviceType
    brand: str | None
    model: str | None


class MovementOfficerInfo(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    full_name: str
    email: str


class MovementGateInfo(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    name: str
    code: str


class MovementResponse(BaseModel):
    """Rich response returned after a check-in or check-out operation."""
    model_config = {"from_attributes": True}

    movement_id: uuid.UUID
    movement_type: MovementType
    previous_status: DeviceStatus
    new_status: DeviceStatus
    occurred_at: datetime
    device: MovementDeviceInfo
    officer: MovementOfficerInfo
    gate: MovementGateInfo
    notes: str | None


class CheckMovementRequest(BaseModel):
    """Optional notes the officer may attach to a movement."""
    notes: str | None = None
