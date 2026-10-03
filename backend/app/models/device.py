import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import DeviceStatus, DeviceType


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    serial_number: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    device_type: Mapped[DeviceType] = mapped_column(Enum(DeviceType, name="devicetype"), nullable=False)
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    status: Mapped[DeviceStatus] = mapped_column(Enum(DeviceStatus, name="devicestatus"), nullable=False, default=DeviceStatus.INSIDE_CAMPUS)
    qr_code_value: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="devices", foreign_keys=[owner_id])
    movements: Mapped[list["DeviceMovement"]] = relationship("DeviceMovement", back_populates="device")
    incidents: Mapped[list["Incident"]] = relationship("Incident", back_populates="device")
    temporary_exit_requests: Mapped[list["TemporaryExitRequest"]] = relationship(
        "TemporaryExitRequest",
        back_populates="device",
        foreign_keys="TemporaryExitRequest.device_id",
    )
