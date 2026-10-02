import uuid
from datetime import datetime

from pydantic import BaseModel, model_validator

from app.models.enums import DeviceStatus, IncidentStatus, IncidentType

# Valid forward transitions — CLOSED is terminal (no reopening without explicit admin override)
_ALLOWED_TRANSITIONS: dict[IncidentStatus, set[IncidentStatus]] = {
    IncidentStatus.OPEN: {IncidentStatus.INVESTIGATING},
    IncidentStatus.INVESTIGATING: {IncidentStatus.RESOLVED},
    IncidentStatus.RESOLVED: {IncidentStatus.CLOSED},
    IncidentStatus.CLOSED: set(),
}

_RECOVERABLE_STATUSES = {DeviceStatus.INSIDE_CAMPUS, DeviceStatus.OUTSIDE_CAMPUS}


class IncidentCreate(BaseModel):
    device_id: uuid.UUID | None = None
    reported_by: uuid.UUID | None = None  # ignored — always overridden by authenticated actor
    gate_id: uuid.UUID | None = None
    incident_type: IncidentType
    description: str


class IncidentPatchRequest(BaseModel):
    """ADMIN-only: advance incident status and/or update description."""
    status: IncidentStatus
    description: str | None = None

    @model_validator(mode="before")
    @classmethod
    def status_required(cls, values: dict) -> dict:
        if "status" not in values or values["status"] is None:
            raise ValueError("status is required")
        return values


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


class ReportLostRequest(BaseModel):
    """Optional reason/details from the owner."""
    description: str = "Device reported as lost by owner"


class RecoverDeviceRequest(BaseModel):
    """ADMIN-only: explicit resulting status after recovery."""
    resulting_status: DeviceStatus
    description: str | None = None

    @model_validator(mode="after")
    def status_must_be_recoverable(self) -> "RecoverDeviceRequest":
        if self.resulting_status not in _RECOVERABLE_STATUSES:
            raise ValueError(
                f"resulting_status must be one of: "
                f"{', '.join(s.value for s in _RECOVERABLE_STATUSES)}"
            )
        return self


def validate_transition(current: IncidentStatus, next_status: IncidentStatus) -> None:
    """Raise ValueError if the transition is not allowed."""
    allowed = _ALLOWED_TRANSITIONS.get(current, set())
    if next_status not in allowed:
        raise ValueError(
            f"Cannot transition incident from {current.value} to {next_status.value}"
        )
