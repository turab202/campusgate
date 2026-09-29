import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import MovementType


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
