import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import TemporaryExitRequestStatus


class TemporaryExitRequest(Base):
    __tablename__ = "temporary_exit_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    device_description: Mapped[str] = mapped_column(String(255), nullable=False)
    serial_number: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    applicant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    destination: Mapped[str] = mapped_column(String(500), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    expected_return_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[TemporaryExitRequestStatus] = mapped_column(
        Enum(TemporaryExitRequestStatus, name="temporaryexitrequeststatus"),
        nullable=False,
        default=TemporaryExitRequestStatus.PENDING,
        index=True,
    )
    submitted_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reviewed_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    device: Mapped["Device | None"] = relationship(
        "Device",
        back_populates="temporary_exit_requests",
        foreign_keys=[device_id],
    )
    applicant: Mapped["User"] = relationship(
        "User",
        back_populates="temporary_exit_requests",
        foreign_keys=[applicant_id],
    )
    reviewer: Mapped["User | None"] = relationship(
        "User",
        back_populates="temporary_exit_requests_reviewed",
        foreign_keys=[reviewed_by_id],
    )
