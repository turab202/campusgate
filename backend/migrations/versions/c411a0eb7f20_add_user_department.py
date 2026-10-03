"""add user department

Revision ID: c411a0eb7f20
Revises: 2b0147f58818
Create Date: 2026-10-02 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c411a0eb7f20"
down_revision: Union[str, Sequence[str], None] = "2b0147f58818"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("department", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "department")