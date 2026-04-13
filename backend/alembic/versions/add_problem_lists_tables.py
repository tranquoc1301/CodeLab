"""Add problem lists tables

Revision ID: add_problem_lists
Revises: a1b2c3d4e5f6
Create Date: 2026-04-10 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "add_problem_lists"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create problem_lists table
    op.create_table(
        "problem_lists",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_problem_lists_id"), "problem_lists", ["id"], unique=False)

    # Create problem_list_items table
    op.create_table(
        "problem_list_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("problem_list_id", sa.Integer(), nullable=False),
        sa.Column("problem_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["problem_list_id"], ["problem_lists.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["problem_id"], ["problems.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_problem_list_items_id"), "problem_list_items", ["id"], unique=False
    )

    # Add indexes on foreign keys for faster queries
    op.create_index(
        "ix_problem_list_items_problem_list_id",
        "problem_list_items",
        ["problem_list_id"],
    )
    op.create_index(
        "ix_problem_list_items_problem_id",
        "problem_list_items",
        ["problem_id"],
    )

    # Add composite unique constraint to prevent duplicates
    op.create_unique_constraint(
        "uq_problem_list_items_problem_list_problem",
        "problem_list_items",
        ["problem_list_id", "problem_id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "uq_problem_list_items_problem_list_problem",
        "problem_list_items",
        type_="unique",
    )
    op.drop_index("ix_problem_list_items_problem_id", table_name="problem_list_items")
    op.drop_index(
        "ix_problem_list_items_problem_list_id", table_name="problem_list_items"
    )
    op.drop_index(op.f("ix_problem_list_items_id"), table_name="problem_list_items")
    op.drop_table("problem_list_items")
    op.drop_index(op.f("ix_problem_lists_id"), table_name="problem_lists")
    op.drop_table("problem_lists")
