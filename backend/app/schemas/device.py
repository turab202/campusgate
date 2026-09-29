import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import DeviceStatus, DeviceType


class DeviceCreate(BaseModel):
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
