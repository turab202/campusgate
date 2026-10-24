import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.enums import BelongingsClearanceStatus


class BelongingsItemCreate(BaseModel):
    item_name: str = Field(min_length=1, max_length=100)
    quantity: int = Field(gt=0, le=9999)

    @field_validator("item_name")
    @classmethod
    def item_name_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("item_name must not be blank")
        return value


class BelongingsClearanceCreate(BaseModel):
    submission_key: uuid.UUID
    dormitory: str = Field(min_length=1, max_length=255)
    room_number: str | None = Field(default=None, max_length=50)
    intended_exit_at: datetime
    remarks: str | None = Field(default=None, max_length=2000)
    items: list[BelongingsItemCreate] = Field(min_length=1, max_length=100)

    @field_validator("dormitory")
    @classmethod
    def dormitory_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("dormitory must not be blank")
        return value

    @field_validator("room_number", "remarks")
    @classmethod
    def optional_text_is_normalized(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("intended_exit_at")
    @classmethod
    def intended_exit_must_include_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("intended_exit_at must include a timezone")
        return value

    @model_validator(mode="after")
    def item_names_must_be_unique(self):
        names = [item.item_name.casefold() for item in self.items]
        if len(names) != len(set(names)):
            raise ValueError("Belongings item names must be unique")
        return self


class BelongingsClearanceReject(BaseModel):
    reason: str = Field(min_length=3, max_length=2000)

    @field_validator("reason")
    @classmethod
    def reason_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("A meaningful rejection reason is required")
        return value


class BelongingsClearanceCancel(BaseModel):
    reason: str | None = Field(default=None, max_length=500)

    @field_validator("reason")
    @classmethod
    def normalize_reason(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class BelongingsClearanceItemRead(BaseModel):
    id: uuid.UUID
    item_name: str
    quantity: int

    model_config = {"from_attributes": True}


class BelongingsClearanceRead(BaseModel):
    id: uuid.UUID
    reference: str
    student_id: uuid.UUID
    student_name: str
    student_campus_id: str | None
    student_department: str | None
    dormitory: str
    room_number: str | None
    intended_exit_at: datetime
    remarks: str | None
    status: BelongingsClearanceStatus
    created_at: datetime
    updated_at: datetime
    decided_by_id: uuid.UUID | None
    proctor_name: str | None
    decided_at: datetime | None
    decision_reason: str | None
    pass_expires_at: datetime | None
    pass_revoked_at: datetime | None
    pass_revocation_reason: str | None
    pass_used_at: datetime | None
    exit_officer_id: uuid.UUID | None
    exit_gate_id: uuid.UUID | None
    exit_recorded_at: datetime | None
    exit_identity_verified: bool
    pass_state: str
    is_pass_valid: bool
    pass_token: str | None = None
    items: list[BelongingsClearanceItemRead]


class BelongingsGateLookup(BaseModel):
    token: str | None = Field(default=None, min_length=12, max_length=512)
    reference: str | None = Field(default=None, min_length=6, max_length=32)

    @field_validator("token", "reference")
    @classmethod
    def normalize_lookup_value(cls, value: str | None) -> str | None:
        return value.strip() if value else None

    @model_validator(mode="after")
    def exactly_one_lookup_value(self):
        if bool(self.token) == bool(self.reference):
            raise ValueError("Provide exactly one of token or reference")
        return self


class BelongingsExitRecord(BelongingsGateLookup):
    identity_verified: bool

    @model_validator(mode="after")
    def require_identity_check(self):
        if not self.identity_verified:
            raise ValueError("Student identity must be verified before recording an exit")
        return self


class BelongingsDiscrepancy(BelongingsGateLookup):
    reason: str = Field(min_length=3, max_length=2000)

    @field_validator("reason")
    @classmethod
    def discrepancy_reason_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("A discrepancy reason is required")
        return value


class BelongingsGateRead(BaseModel):
    clearance: BelongingsClearanceRead
    is_valid: bool
    validation_message: str
