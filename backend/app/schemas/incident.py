import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import IncidentStatus, IncidentType


class IncidentCreate(BaseModel):
    device_id: uuid.UUID | None = None
    reported_by: uuid.UUID
    gate_id: uuid.UUID | None = None
    incident_type: IncidentType
    description: str


class IncidentUpdate(BaseModel):
    status: IncidentStatus | None = None
    description: str | None = None


class IncidentRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    device_id: uuid.UUID | None
    reported_by: uuid.UUID
    gate_id: uuid.UUID | None
    incident_type: IncidentType
    description: str
    status: IncidentStatus
    created_at: datetime
    updated_at: datetime
