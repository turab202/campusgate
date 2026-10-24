import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    false,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import BelongingsClearanceStatus


class BelongingsExitClearance(Base):
    __tablename__ = "belongings_exit_clearances"
    __table_args__ = (
        CheckConstraint(
            "(pass_nonce IS NULL AND pass_expires_at IS NULL) OR "
            "(pass_nonce IS NOT NULL AND pass_expires_at IS NOT NULL)",
            name="ck_belongings_clearance_pass_metadata",
        ),
        CheckConstraint(
            "(pass_used_at IS NULL AND exit_officer_id IS NULL AND exit_gate_id IS NULL AND exit_recorded_at IS NULL AND exit_identity_verified = false) OR "
            "(pass_used_at IS NOT NULL AND exit_officer_id IS NOT NULL AND exit_gate_id IS NOT NULL AND exit_recorded_at IS NOT NULL AND exit_identity_verified = true)",
            name="ck_belongings_clearance_exit_metadata",
        ),
        CheckConstraint(
            "(status = 'PENDING' AND decided_by_id IS NULL AND decided_at IS NULL) OR "
            "(status = 'APPROVED' AND decided_by_id IS NOT NULL AND decided_at IS NOT NULL AND pass_nonce IS NOT NULL AND decision_reason IS NULL) OR "
            "(status = 'REJECTED' AND decided_by_id IS NOT NULL AND decided_at IS NOT NULL AND decision_reason IS NOT NULL AND pass_nonce IS NULL) OR "
            "(status = 'CANCELLED' AND decided_by_id IS NULL AND decided_at IS NOT NULL AND pass_nonce IS NULL)",
            name="ck_belongings_clearance_decision_state",
        ),
        CheckConstraint(
            "(pass_revoked_at IS NULL AND pass_revocation_reason IS NULL) OR "
            "(pass_revoked_at IS NOT NULL AND pass_revocation_reason IS NOT NULL)",
            name="ck_belongings_clearance_revocation_metadata",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    submission_key: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    student_department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dormitory: Mapped[str] = mapped_column(String(255), nullable=False)
    room_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    intended_exit_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[BelongingsClearanceStatus] = mapped_column(
        Enum(BelongingsClearanceStatus, name="belongingsclearancestatus"),
        nullable=False,
        default=BelongingsClearanceStatus.PENDING,
        index=True,
    )
    decided_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    pass_nonce: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    pass_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pass_revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pass_revocation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    pass_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    exit_officer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    exit_gate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("gates.id", ondelete="SET NULL"), nullable=True
    )
    exit_recorded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    exit_identity_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    student: Mapped["User"] = relationship(
        "User", back_populates="belongings_clearances", foreign_keys=[student_id]
    )
    decided_by: Mapped["User | None"] = relationship("User", foreign_keys=[decided_by_id])
    exit_officer: Mapped["User | None"] = relationship("User", foreign_keys=[exit_officer_id])
    exit_gate: Mapped["Gate | None"] = relationship("Gate")
    items: Mapped[list["BelongingsExitItem"]] = relationship(
        "BelongingsExitItem", back_populates="clearance", cascade="all, delete-orphan"
    )


class BelongingsExitItem(Base):
    __tablename__ = "belongings_exit_items"
    __table_args__ = (CheckConstraint("quantity > 0", name="ck_belongings_exit_items_quantity_positive"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clearance_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("belongings_exit_clearances.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_name: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    clearance: Mapped[BelongingsExitClearance] = relationship(
        "BelongingsExitClearance", back_populates="items"
    )
