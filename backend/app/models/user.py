import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="userrole"), nullable=False)
    campus_id: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    devices: Mapped[list["Device"]] = relationship("Device", back_populates="owner", foreign_keys="Device.owner_id")
    gate_assignments: Mapped[list["GateAssignment"]] = relationship("GateAssignment", back_populates="officer")
    movements_processed: Mapped[list["DeviceMovement"]] = relationship("DeviceMovement", back_populates="officer")
    incidents_reported: Mapped[list["Incident"]] = relationship("Incident", back_populates="reporter")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="actor")
