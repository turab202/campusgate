import uuid
from datetime import datetime

from pydantic import BaseModel


class GateAssignmentCreate(BaseModel):
    officer_id: uuid.UUID
    gate_id: uuid.UUID
    start_time: datetime
    end_time: datetime | None = None


class GateAssignmentUpdate(BaseModel):
    end_time: datetime | None = None
    is_active: bool | None = None


class GateAssignmentRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    officer_id: uuid.UUID
    gate_id: uuid.UUID
    start_time: datetime
    end_time: datetime | None
    is_active: bool
    created_at: datetime
