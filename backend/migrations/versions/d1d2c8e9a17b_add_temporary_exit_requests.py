"""add temporary exit requests

Revision ID: d1d2c8e9a17b
Revises: c411a0eb7f20
Create Date: 2026-10-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d1d2c8e9a17b"
down_revision: Union[str, Sequence[str], None] = "c411a0eb7f20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'temporaryexitrequeststatus') THEN
                    CREATE TYPE temporaryexitrequeststatus AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'COMPLETED');
                END IF;
            END$$;
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS temporary_exit_requests (
                id UUID PRIMARY KEY,
                request_number VARCHAR(50) NOT NULL,
                device_id UUID NULL,
                device_description VARCHAR(255) NOT NULL,
                serial_number VARCHAR(255) NULL,
                applicant_id UUID NOT NULL,
                department VARCHAR(255) NULL,
                destination VARCHAR(500) NOT NULL,
                reason TEXT NOT NULL,
                expected_return_date DATE NOT NULL,
                status temporaryexitrequeststatus NOT NULL DEFAULT 'PENDING',
                submitted_date TIMESTAMPTZ NOT NULL DEFAULT now(),
                reviewed_by_id UUID NULL,
                reviewed_date TIMESTAMPTZ NULL,
                rejection_reason TEXT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT temporary_exit_requests_device_id_fkey FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
                CONSTRAINT temporary_exit_requests_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE RESTRICT,
                CONSTRAINT temporary_exit_requests_reviewer_id_fkey FOREIGN KEY (reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL
            );
            """
        )
    )
    op.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS ix_temporary_exit_requests_request_number ON temporary_exit_requests (request_number)"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_temporary_exit_requests_applicant_id ON temporary_exit_requests (applicant_id)"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_temporary_exit_requests_device_id ON temporary_exit_requests (device_id)"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_temporary_exit_requests_expected_return_date ON temporary_exit_requests (expected_return_date)"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_temporary_exit_requests_reviewed_by_id ON temporary_exit_requests (reviewed_by_id)"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_temporary_exit_requests_serial_number ON temporary_exit_requests (serial_number)"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_temporary_exit_requests_status ON temporary_exit_requests (status)"))


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS ix_temporary_exit_requests_status"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_temporary_exit_requests_serial_number"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_temporary_exit_requests_reviewed_by_id"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_temporary_exit_requests_expected_return_date"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_temporary_exit_requests_device_id"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_temporary_exit_requests_applicant_id"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_temporary_exit_requests_request_number"))
    op.execute(sa.text("DROP TABLE IF EXISTS temporary_exit_requests"))
    op.execute(sa.text("DROP TYPE IF EXISTS temporaryexitrequeststatus"))
