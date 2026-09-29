import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator

from app.models.enums import UserRole


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None
    password_hash: str
    role: UserRole
    campus_id: str | None = None

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("full_name must not be empty")
        return v


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
