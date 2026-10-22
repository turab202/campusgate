import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models.enums import UserRole


class BootstrapAccount(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=16, max_length=72)

    @field_validator("full_name")
    @classmethod
    def full_name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("full_name must not be blank")
        return value.strip()

    @field_validator("password")
    @classmethod
    def password_within_bcrypt_byte_limit(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("password must be at most 72 UTF-8 bytes")
        return value


class BootstrapRequest(BaseModel):
    office_gate: BootstrapAccount
    admin: BootstrapAccount

    @model_validator(mode="after")
    def accounts_must_have_distinct_emails(self):
        if str(self.office_gate.email).lower() == str(self.admin.email).lower():
            raise ValueError("Office Gate and Admin accounts must use different emails")
        if self.office_gate.password == self.admin.password:
            raise ValueError("Office Gate and Admin accounts must use different passwords")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: uuid.UUID
    role: UserRole
    full_name: str


class MeResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    full_name: str
    email: str
    phone: str | None
    role: UserRole
    campus_id: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
