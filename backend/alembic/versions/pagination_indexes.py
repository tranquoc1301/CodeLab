"""Add pagination indexes for efficient cursor-based queries.

This migration adds indexes to support cursor-based pagination with various sort options.
The indexes cover:
- frontend_id (primary sort by problem number)
- created_at (sort by newest/oldest)
- difficulty + created_at (compound index for filtered queries)
- slug (for unique lookups)

Revision ID: pagination_indexes
Revises: 
Create Date: 2026-03-31
"""
from alembic import op

revision = 'pagination_indexes'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        'ix_problems_frontend_id',
        'problems',
        ['frontend_id'],
        unique=False
    )
    
    op.create_index(
        'ix_problems_created_at',
        'problems',
        ['created_at'],
        unique=False
    )
    
    op.create_index(
        'ix_problems_difficulty_created_at',
        'problems',
        ['difficulty', 'created_at'],
        unique=False
    )
    
    op.create_index(
        'ix_problems_title',
        'problems',
        ['title'],
        unique=False
    )
    
    op.create_index(
        'idx_problems_pagination_frontend_id',
        'problems',
        ['frontend_id'],
        unique=False,
        postgresql_using='btree',
        postgresql_concurrently=True
    )
    
    op.create_index(
        'idx_problems_pagination_created_at',
        'problems',
        ['created_at'],
        unique=False,
        postgresql_using='btree',
        postgresql_concurrently=True
    )
    
    op.create_index(
        'idx_problems_pagination_difficulty_created',
        'problems',
        ['difficulty', 'created_at'],
        unique=False,
        postgresql_using='btree',
        postgresql_concurrently=True
    )


def downgrade() -> None:
    op.drop_index('idx_problems_pagination_difficulty_created', table_name='problems')
    op.drop_index('idx_problems_pagination_created_at', table_name='problems')
    op.drop_index('idx_problems_pagination_frontend_id', table_name='problems')
    op.drop_index('ix_problems_title', table_name='problems')
    op.drop_index('ix_problems_difficulty_created_at', table_name='problems')
    op.drop_index('ix_problems_created_at', table_name='problems')
    op.drop_index('ix_problems_frontend_id', table_name='problems')