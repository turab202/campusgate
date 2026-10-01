import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import VisitStatus


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visitor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("visitors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    host_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    # Gate recorded at check-in (from officer's active assignment)
    checkin_gate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gates.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Gate recorded at check-out (may differ from check-in gate)
    checkout_gate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gates.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[VisitStatus] = mapped_column(
        Enum(VisitStatus, name="visitstatus"), nullable=False, default=VisitStatus.PENDING
    )
    qr_code_value: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    expected_start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expected_end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    checked_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    visitor: Mapped["Visitor"] = relationship("Visitor", back_populates="visits")
    host: Mapped["User"] = relationship("User", foreign_keys=[host_user_id])
    checkin_gate: Mapped["Gate | None"] = relationship("Gate", foreign_keys=[checkin_gate_id])
    checkout_gate: Mapped["Gate | None"] = relationship("Gate", foreign_keys=[checkout_gate_id])
