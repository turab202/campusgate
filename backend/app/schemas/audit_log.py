import uuid
from datetime import datetime

from pydantic import BaseModel


class AuditLogCreate(BaseModel):
    actor_id: uuid.UUID | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    description: str | None = None


class AuditLogRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    actor_id: uuid.UUID | None
    action: str
    entity_type: str
    entity_id: str | None
    description: str | None
    created_at: datetime
