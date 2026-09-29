import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator

from app.models.enums import DeviceStatus, DeviceType


class DeviceEnrollRequest(BaseModel):
    """What the caller supplies when enrolling a device.

    asset_id and qr_code_value are generated server-side.
    owner_id is supplied only by ADMIN/GATE_OFFICER; STUDENT/STAFF enroll for themselves.
    """
    serial_number: str
    device_type: DeviceType
    brand: str | None = None
    model: str | None = None
    owner_id: uuid.UUID | None = None  # omit → enroll for self

    @field_validator("serial_number")
    @classmethod
    def serial_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("serial_number must not be empty")
        return v.strip()


class DeviceCreate(BaseModel):
    """Internal schema used by the service layer."""
    asset_id: str
    serial_number: str
    device_type: DeviceType
    brand: str | None = None
    model: str | None = None
    owner_id: uuid.UUID
    qr_code_value: str


class DeviceUpdate(BaseModel):
    brand: str | None = None
    model: str | None = None
    status: DeviceStatus | None = None


class DeviceRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    asset_id: str
    serial_number: str
    device_type: DeviceType
    brand: str | None
    model: str | None
    owner_id: uuid.UUID
    status: DeviceStatus
    qr_code_value: str
    registered_at: datetime
    created_at: datetime
    updated_at: datetime
