import uuid
from datetime import datetime

from pydantic import BaseModel, model_validator

from app.models.enums import IdentificationType, VisitStatus


# ---------------------------------------------------------------------------
# Visitor
# ---------------------------------------------------------------------------

class VisitorCreate(BaseModel):
    full_name: str
    phone: str | None = None
    identification_type: IdentificationType
    identification_number: str
    organization: str | None = None
    purpose: str | None = None


class VisitorRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    full_name: str
    phone: str | None
    identification_type: IdentificationType
    identification_number: str
    organization: str | None
    purpose: str | None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Visit
# ---------------------------------------------------------------------------

class VisitCreateRequest(BaseModel):
    """What the caller supplies when creating a visit request."""
    visitor: VisitorCreate
    host_user_id: uuid.UUID
    expected_start_at: datetime
    expected_end_at: datetime

    @model_validator(mode="after")
    def end_after_start(self) -> "VisitCreateRequest":
        if self.expected_end_at <= self.expected_start_at:
            raise ValueError("expected_end_at must be after expected_start_at")
        return self


class VisitRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    visitor_id: uuid.UUID
    host_user_id: uuid.UUID
    checkin_gate_id: uuid.UUID | None
    checkout_gate_id: uuid.UUID | None
    status: VisitStatus
    qr_code_value: str | None
    expected_start_at: datetime
    expected_end_at: datetime
    checked_in_at: datetime | None
    checked_out_at: datetime | None
    created_at: datetime
    updated_at: datetime


class VisitActionRequest(BaseModel):
    """Optional notes for approve/reject/check-in/check-out actions."""
    notes: str | None = None
