"""add_submission_hints_table

Revision ID: 18b2552e7116
Revises: drop_error_annotations
Create Date: 2026-05-02 12:19:36.261857

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '18b2552e7116'
down_revision: Union[str, Sequence[str], None] = 'drop_error_annotations'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('submission_hints',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('problem_id', sa.Integer(), nullable=False),
        sa.Column('current_level', sa.SmallInteger(), nullable=False),
        sa.Column('hint_1', sa.Text(), nullable=True),
        sa.Column('hint_2', sa.Text(), nullable=True),
        sa.Column('hint_3', sa.Text(), nullable=True),
        sa.Column('last_error_label', sa.String(length=64), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'problem_id', name='uq_submission_hints_user_problem')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('submission_hints')
