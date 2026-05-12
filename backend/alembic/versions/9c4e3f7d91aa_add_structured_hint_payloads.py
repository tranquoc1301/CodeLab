"""add structured hint payloads

Revision ID: 9c4e3f7d91aa
Revises: 625a6ddab953
Create Date: 2026-05-12 17:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "9c4e3f7d91aa"
down_revision: Union[str, Sequence[str], None] = "625a6ddab953"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("submission_hints", sa.Column("payload_1", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("submission_hints", sa.Column("payload_2", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("submission_hints", sa.Column("payload_3", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column("submission_hints", "payload_3")
    op.drop_column("submission_hints", "payload_2")
    op.drop_column("submission_hints", "payload_1")
