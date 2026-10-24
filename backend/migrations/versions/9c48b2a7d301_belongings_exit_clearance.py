"""add belongings exit clearance workflow

Revision ID: 9c48b2a7d301
Revises: 7e5d9236a110
Create Date: 2026-10-24 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9c48b2a7d301"
down_revision: Union[str, Sequence[str], None] = "7e5d9236a110"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'PROCTOR'")

    clearance_status = sa.Enum(
        "PENDING",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
        name="belongingsclearancestatus",
    )
    op.create_table(
        "belongings_exit_clearances",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("reference", sa.String(length=32), nullable=False),
        sa.Column("submission_key", sa.UUID(), nullable=False),
        sa.Column("student_id", sa.UUID(), nullable=False),
        sa.Column("student_department", sa.String(length=255), nullable=True),
        sa.Column("dormitory", sa.String(length=255), nullable=False),
        sa.Column("room_number", sa.String(length=50), nullable=True),
        sa.Column("intended_exit_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("remarks", sa.Text(), nullable=True),
        sa.Column("status", clearance_status, nullable=False),
        sa.Column("decided_by_id", sa.UUID(), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_reason", sa.Text(), nullable=True),
        sa.Column("pass_nonce", sa.String(length=64), nullable=True),
        sa.Column("pass_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pass_revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pass_revocation_reason", sa.Text(), nullable=True),
        sa.Column("pass_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("exit_officer_id", sa.UUID(), nullable=True),
        sa.Column("exit_gate_id", sa.UUID(), nullable=True),
        sa.Column("exit_recorded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("exit_identity_verified", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "(pass_nonce IS NULL AND pass_expires_at IS NULL) OR "
            "(pass_nonce IS NOT NULL AND pass_expires_at IS NOT NULL)",
            name="ck_belongings_clearance_pass_metadata",
        ),
        sa.CheckConstraint(
            "(pass_used_at IS NULL AND exit_officer_id IS NULL AND exit_gate_id IS NULL AND exit_recorded_at IS NULL AND exit_identity_verified = false) OR "
            "(pass_used_at IS NOT NULL AND exit_officer_id IS NOT NULL AND exit_gate_id IS NOT NULL AND exit_recorded_at IS NOT NULL AND exit_identity_verified = true)",
            name="ck_belongings_clearance_exit_metadata",
        ),
        sa.CheckConstraint(
            "(status = 'PENDING' AND decided_by_id IS NULL AND decided_at IS NULL) OR "
            "(status = 'APPROVED' AND decided_by_id IS NOT NULL AND decided_at IS NOT NULL AND pass_nonce IS NOT NULL AND decision_reason IS NULL) OR "
            "(status = 'REJECTED' AND decided_by_id IS NOT NULL AND decided_at IS NOT NULL AND decision_reason IS NOT NULL AND pass_nonce IS NULL) OR "
            "(status = 'CANCELLED' AND decided_by_id IS NULL AND decided_at IS NOT NULL AND pass_nonce IS NULL)",
            name="ck_belongings_clearance_decision_state",
        ),
        sa.CheckConstraint(
            "(pass_revoked_at IS NULL AND pass_revocation_reason IS NULL) OR "
            "(pass_revoked_at IS NOT NULL AND pass_revocation_reason IS NOT NULL)",
            name="ck_belongings_clearance_revocation_metadata",
        ),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["decided_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["exit_officer_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["exit_gate_id"], ["gates.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pass_nonce"),
        sa.UniqueConstraint("submission_key"),
    )
    op.create_index("ix_belongings_exit_clearances_student_id", "belongings_exit_clearances", ["student_id"])
    op.create_index("ix_belongings_exit_clearances_status", "belongings_exit_clearances", ["status"])
    op.create_index("ix_belongings_exit_clearances_intended_exit_at", "belongings_exit_clearances", ["intended_exit_at"])
    op.create_index("ix_belongings_exit_clearances_decided_by_id", "belongings_exit_clearances", ["decided_by_id"])
    op.create_index("ix_belongings_exit_clearances_reference", "belongings_exit_clearances", ["reference"], unique=True)

    op.create_table(
        "belongings_exit_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("clearance_id", sa.UUID(), nullable=False),
        sa.Column("item_name", sa.String(length=100), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_belongings_exit_items_quantity_positive"),
        sa.ForeignKeyConstraint(["clearance_id"], ["belongings_exit_clearances.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_belongings_exit_items_clearance_id", "belongings_exit_items", ["clearance_id"])


def downgrade() -> None:
    op.drop_index("ix_belongings_exit_items_clearance_id", table_name="belongings_exit_items")
    op.drop_table("belongings_exit_items")
    op.drop_index("ix_belongings_exit_clearances_reference", table_name="belongings_exit_clearances")
    op.drop_index("ix_belongings_exit_clearances_decided_by_id", table_name="belongings_exit_clearances")
    op.drop_index("ix_belongings_exit_clearances_intended_exit_at", table_name="belongings_exit_clearances")
    op.drop_index("ix_belongings_exit_clearances_status", table_name="belongings_exit_clearances")
    op.drop_index("ix_belongings_exit_clearances_student_id", table_name="belongings_exit_clearances")
    op.drop_table("belongings_exit_clearances")
    sa.Enum(name="belongingsclearancestatus").drop(op.get_bind(), checkfirst=True)
