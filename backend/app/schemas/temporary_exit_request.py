import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import TemporaryExitRequestStatus


class TemporaryExitRequestCreate(BaseModel):
    device_id: uuid.UUID | None = None
    device_description: str = Field(..., min_length=1)
    serial_number: str | None = None
    destination: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)
    expected_return_date: date

    @field_validator("device_description", "destination", "reason")
    @classmethod
    def nonempty_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field must not be empty")
        return cleaned

    @field_validator("serial_number")
    @classmethod
    def normalize_serial(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class TemporaryExitRequestRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    request_number: str
    device_id: uuid.UUID | None
    device_description: str
    serial_number: str | None
    applicant_id: uuid.UUID
    applicant_name: str
    department: str | None
    destination: str
    reason: str
    expected_return_date: date
    status: TemporaryExitRequestStatus
    submitted_date: datetime
    reviewed_by: str | None
    reviewed_by_id: uuid.UUID | None
    reviewed_date: datetime | None
    rejection_reason: str | None


class TemporaryExitRequestApproveRequest(BaseModel):
    pass


class TemporaryExitRequestRejectRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=10)

    @field_validator("rejection_reason")
    @classmethod
    def valid_reason(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("rejection_reason is required")
        if len(cleaned) < 10:
            raise ValueError("rejection_reason must be meaningful")
        return cleaned
