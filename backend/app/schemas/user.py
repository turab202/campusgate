import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.enums import UserRole


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None
    department: str | None = None
    password_hash: str
    role: UserRole
    campus_id: str | None = None

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("full_name must not be empty")
        return v


class UserRegistrationRequest(BaseModel):
    full_name: str
    campus_id: str
    department: str
    email: EmailStr
    phone: str | None = None
    password: str = Field(min_length=6, max_length=128)
    role: UserRole

    @field_validator("full_name", "campus_id", "department")
    @classmethod
    def required_text_not_empty(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Field must not be empty")
        return normalized

    @field_validator("campus_id")
    @classmethod
    def normalize_campus_id(cls, value: str) -> str:
        return value.strip()

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("role")
    @classmethod
    def self_registration_role_only(cls, value: UserRole) -> UserRole:
        if value not in (UserRole.STUDENT, UserRole.STAFF):
            raise ValueError("Public registration is limited to STUDENT and STAFF")
        return value


class UserRegistrationRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    full_name: str
    email: str
    phone: str | None
    department: str | None
    role: UserRole
    campus_id: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    is_active: bool | None = None


class UserRead(BaseModel):
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
