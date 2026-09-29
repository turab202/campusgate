import uuid
from datetime import datetime

from pydantic import BaseModel


class GateCreate(BaseModel):
    name: str
    code: str
    location: str | None = None


class GateUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    is_active: bool | None = None


class GateRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    code: str
    location: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
