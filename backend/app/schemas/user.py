import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

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


class ManagedUserCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=16, max_length=72)
    role: UserRole
    phone: str | None = Field(default=None, max_length=50)
    department: str | None = Field(default=None, max_length=255)
    campus_id: str | None = Field(default=None, max_length=50)

    @field_validator("full_name")
    @classmethod
    def managed_name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("full_name must not be blank")
        return value.strip()

    @field_validator("password")
    @classmethod
    def managed_password_within_bcrypt_limit(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("password must be at most 72 UTF-8 bytes")
        return value

    @field_validator("role")
    @classmethod
    def privileged_role_only(cls, value: UserRole) -> UserRole:
        if value not in (UserRole.GATE_OFFICER, UserRole.ADMIN):
            raise ValueError("Managed accounts must be ADMIN or GATE_OFFICER")
        return value


class ManagedUserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=16, max_length=72)

    @field_validator("full_name")
    @classmethod
    def updated_name_not_blank(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not value.strip():
            raise ValueError("full_name must not be blank")
        return value.strip()

    @field_validator("password")
    @classmethod
    def updated_password_within_bcrypt_limit(cls, value: str | None) -> str | None:
        if value is not None and len(value.encode("utf-8")) > 72:
            raise ValueError("password must be at most 72 UTF-8 bytes")
        return value

    @field_validator("role")
    @classmethod
    def updated_privileged_role_only(cls, value: UserRole | None) -> UserRole | None:
        if value is not None and value not in (UserRole.GATE_OFFICER, UserRole.ADMIN):
            raise ValueError("Managed accounts must be ADMIN or GATE_OFFICER")
        return value

    @model_validator(mode="after")
    def at_least_one_field_must_be_updated(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided")
        if any(getattr(self, field) is None for field in self.model_fields_set):
            raise ValueError("Updated fields cannot be null")
        return self


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
