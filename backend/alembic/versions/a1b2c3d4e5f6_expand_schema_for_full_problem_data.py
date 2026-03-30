"""expand schema for full LeetCode problem data

Revision ID: a1b2c3d4e5f6
Revises: dd4b90a266cd
Create Date: 2026-03-27 13:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'dd4b90a266cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: expand problems, add topics/examples/hints/snippets/solutions tables."""

    # ================================================================
    # STEP 1: Drop tables that reference old problems
    # ================================================================
    op.drop_table('submissions')
    op.drop_table('problems')

    # ================================================================
    # STEP 2: Create new problems table (must exist before child FKs)
    # ================================================================
    op.create_table(
        'problems',
        sa.Column('id', sa.Integer(), sa.Identity(always=True), primary_key=True),
        sa.Column('problem_id', sa.Integer(), nullable=False, unique=True),
        sa.Column('frontend_id', sa.Integer(), nullable=False, unique=True),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('slug', sa.String(300), nullable=False, unique=True),
        sa.Column('difficulty', sa.String(10), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("difficulty IN ('Easy', 'Medium', 'Hard')", name='ck_problems_difficulty'),
    )

    # ================================================================
    # STEP 3: Create topics (no FK to problems)
    # ================================================================
    op.create_table(
        'topics',
        sa.Column('id', sa.Integer(), sa.Identity(always=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('slug', sa.String(100), nullable=False, unique=True),
    )

    # ================================================================
    # STEP 4: Create all child tables that reference problems
    # ================================================================

    # Problem-Topics join
    op.create_table(
        'problem_topics',
        sa.Column('problem_id', sa.Integer(), sa.ForeignKey('problems.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('topic_id', sa.Integer(), sa.ForeignKey('topics.id', ondelete='CASCADE'), primary_key=True),
    )
    op.create_index('ix_problem_topics_topic_id', 'problem_topics', ['topic_id'])

    # Examples
    op.create_table(
        'examples',
        sa.Column('id', sa.Integer(), sa.Identity(always=True), primary_key=True),
        sa.Column('problem_id', sa.Integer(), sa.ForeignKey('problems.id', ondelete='CASCADE'), nullable=False),
        sa.Column('example_num', sa.Integer(), nullable=False),
        sa.Column('example_text', sa.Text(), nullable=False),
        sa.Column('images', postgresql.JSONB(), server_default='[]', nullable=False),
    )
    op.create_index('ix_examples_problem_id', 'examples', ['problem_id'])

    # Constraints
    op.create_table(
        'problem_constraints',
        sa.Column('id', sa.Integer(), sa.Identity(always=True), primary_key=True),
        sa.Column('problem_id', sa.Integer(), sa.ForeignKey('problems.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('constraint_text', sa.Text(), nullable=False),
    )
    op.create_index('ix_problem_constraints_problem_id', 'problem_constraints', ['problem_id'])

    # Hints
    op.create_table(
        'problem_hints',
        sa.Column('id', sa.Integer(), sa.Identity(always=True), primary_key=True),
        sa.Column('problem_id', sa.Integer(), sa.ForeignKey('problems.id', ondelete='CASCADE'), nullable=False),
        sa.Column('hint_num', sa.Integer(), nullable=False),
        sa.Column('hint_text', sa.Text(), nullable=False),
    )
    op.create_index('ix_problem_hints_problem_id', 'problem_hints', ['problem_id'])

    # Follow-ups
    op.create_table(
        'problem_follow_ups',
        sa.Column('id', sa.Integer(), sa.Identity(always=True), primary_key=True),
        sa.Column('problem_id', sa.Integer(), sa.ForeignKey('problems.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('follow_up_text', sa.Text(), nullable=False),
    )
    op.create_index('ix_problem_follow_ups_problem_id', 'problem_follow_ups', ['problem_id'])

    # Code Snippets
    op.create_table(
        'code_snippets',
        sa.Column('id', sa.Integer(), sa.Identity(always=True), primary_key=True),
        sa.Column('problem_id', sa.Integer(), sa.ForeignKey('problems.id', ondelete='CASCADE'), nullable=False),
        sa.Column('language', sa.String(30), nullable=False),
        sa.Column('code', sa.Text(), nullable=False),
        sa.UniqueConstraint('problem_id', 'language', name='uq_code_snippets_problem_lang'),
    )
    op.create_index('ix_code_snippets_problem_id', 'code_snippets', ['problem_id'])

    # Solutions
    op.create_table(
        'problem_solutions',
        sa.Column('id', sa.Integer(), sa.Identity(always=True), primary_key=True),
        sa.Column('problem_id', sa.Integer(), sa.ForeignKey('problems.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('content', sa.Text(), nullable=False),
    )

    # ================================================================
    # STEP 5: Update users table
    # ================================================================
    op.add_column('users', sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.alter_column('users', 'email', type_=sa.String(255))
    op.alter_column('users', 'created_at', type_=sa.DateTime(timezone=True), server_default=sa.func.now())

    # ================================================================
    # STEP 6: Recreate submissions with new columns
    # ================================================================
    op.create_table(
        'submissions',
        sa.Column('id', sa.Integer(), sa.Identity(always=True), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('problem_id', sa.Integer(), sa.ForeignKey('problems.id', ondelete='SET NULL'), nullable=True),
        sa.Column('source_code', sa.Text(), nullable=False),
        sa.Column('language', sa.String(30), nullable=False),
        sa.Column('status', sa.String(50), nullable=True),
        sa.Column('stdout', sa.Text(), nullable=True),
        sa.Column('stderr', sa.Text(), nullable=True),
        sa.Column('error_type', sa.String(50), nullable=True),
        sa.Column('execution_time_ms', sa.Integer(), nullable=True),
        sa.Column('memory_used_kb', sa.Integer(), nullable=True),
        sa.Column('judge0_token', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_submissions_user_id', 'submissions', ['user_id'])
    op.create_index('ix_submissions_problem_id', 'submissions', ['problem_id'])
    op.create_index('ix_submissions_user_problem', 'submissions', ['user_id', 'problem_id'])
    op.create_index('ix_submissions_created_at', 'submissions', ['created_at'])

    # ================================================================
    # STEP 7: Additional indexes
    # ================================================================
    op.create_index('ix_problems_difficulty', 'problems', ['difficulty'])
    op.create_index('ix_topics_name', 'topics', ['name'])


def downgrade() -> None:
    """Downgrade schema: revert to original 3-table schema."""
    op.drop_table('submissions')

    # Drop new tables
    op.drop_table('problem_solutions')
    op.drop_table('code_snippets')
    op.drop_table('problem_follow_ups')
    op.drop_table('problem_hints')
    op.drop_table('problem_constraints')
    op.drop_table('examples')
    op.drop_table('problem_topics')
    op.drop_table('topics')

    # Drop expanded problems
    op.drop_table('problems')

    # Recreate original problems
    op.create_table(
        'problems',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('difficulty', sa.String(20), nullable=False),
        sa.Column('skill_tags', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('sample_input', sa.Text(), nullable=True),
        sa.Column('sample_output', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_problems_id', 'problems', ['id'])

    # Remove new user columns
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'is_admin')
    op.drop_column('users', 'updated_at')

    # Recreate original submissions
    op.create_table(
        'submissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('problem_id', sa.Integer(), nullable=True),
        sa.Column('source_code', sa.Text(), nullable=False),
        sa.Column('language', sa.String(20), nullable=False),
        sa.Column('status', sa.String(50), nullable=True),
        sa.Column('stdout', sa.Text(), nullable=True),
        sa.Column('stderr', sa.Text(), nullable=True),
        sa.Column('error_type', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_submissions_id', 'submissions', ['id'])
