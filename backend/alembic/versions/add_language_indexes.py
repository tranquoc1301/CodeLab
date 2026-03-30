"""Add performance indexes for language columns"""
from alembic import op

revision = 'add_language_indexes'
down_revision = 'fix_duplicate_hints_follow_ups'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Index on submissions.language for faster lookups
    op.create_index('ix_submissions_language', 'submissions', ['language'], if_not_exists=True)
    
    # Index on code_snippets.language for faster lookups
    op.create_index('ix_code_snippets_language', 'code_snippets', ['language'], if_not_exists=True)
    
    # Composite index for unique constraint enforcement (performance)
    op.create_index('ix_code_snippets_problem_language', 'code_snippets', ['problem_id', 'language'], 
                    if_not_exists=True, unique=True)


def downgrade() -> None:
    op.drop_index('ix_submissions_language', 'submissions')
    op.drop_index('ix_code_snippets_language', 'code_snippets')
    op.drop_index('ix_code_snippets_problem_language', 'code_snippets')