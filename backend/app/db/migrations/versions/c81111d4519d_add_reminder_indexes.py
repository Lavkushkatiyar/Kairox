"""add reminder indexes

Revision ID: c81111d4519d
Revises: a3cea340c227
Create Date: 2026-08-09 17:13:27.486283

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c81111d4519d"
down_revision: str | Sequence[str] | None = "a3cea340c227"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(
        "ix_reminders_user_remind_at", "reminders", ["user_id", "remind_at"]
    )

    op.create_index(
        "ix_reminders_status_remind_at", "reminders", ["status", "remind_at"]
    )

    op.create_index("ix_reminders_task_id", "reminders", ["task_id"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_reminders_user_remind_at", table_name="reminders")
    op.drop_index("ix_reminders_status_remind_at", table_name="reminders")
    op.drop_index("ix_reminders_task_id", table_name="reminders")
