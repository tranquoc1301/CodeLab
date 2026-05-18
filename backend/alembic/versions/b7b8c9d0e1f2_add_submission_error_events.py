"""add submission error events

Revision ID: b7b8c9d0e1f2
Revises: 9c4e3f7d91aa
Create Date: 2026-05-12 22:15:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "9c4e3f7d91aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "submission_error_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("submission_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("problem_id", sa.Integer(), nullable=True),
        sa.Column("error_label", sa.String(length=64), nullable=False),
        sa.Column("diagnosis_detail", sa.String(length=64), nullable=False),
        sa.Column("problem_difficulty", sa.String(length=16), nullable=True),
        sa.Column("topic_slugs", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("submission_created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["problem_id"], ["problems.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("submission_id", name="uq_submission_error_events_submission_id"),
    )
    op.create_index(
        "ix_submission_error_events_user_created_at",
        "submission_error_events",
        ["user_id", "submission_created_at"],
        unique=False,
    )
    op.create_index(
        "ix_submission_error_events_user_label",
        "submission_error_events",
        ["user_id", "error_label"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_submission_error_events_user_label", table_name="submission_error_events")
    op.drop_index("ix_submission_error_events_user_created_at", table_name="submission_error_events")
    op.drop_table("submission_error_events")
