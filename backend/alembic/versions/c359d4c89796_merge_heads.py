"""merge_heads

Revision ID: c359d4c89796
Revises: add_language_indexes, add_problem_lists, pagination_indexes
Create Date: 2026-04-10 15:06:43.489971

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c359d4c89796'
down_revision: Union[str, Sequence[str], None] = ('add_language_indexes', 'add_problem_lists', 'pagination_indexes')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
