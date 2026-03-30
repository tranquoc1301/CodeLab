"""fix duplicate hints and follow_ups"""
from alembic import op
import sqlalchemy as sa

revision = 'fix_duplicate_hints_follow_ups'
down_revision = 'fix_duplicate_constraints'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # Clean up hints
    conn.execute(sa.text("""
        DELETE FROM problem_hints
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY problem_id, hint_num 
                    ORDER BY id
                ) as rn
                FROM problem_hints
            ) sub
            WHERE rn > 1
        )
    """))
    op.create_unique_constraint('uq_problem_hints_problem_hint_num', 'problem_hints', ['problem_id', 'hint_num'])
    
    # Clean up follow_ups
    conn.execute(sa.text("""
        DELETE FROM problem_follow_ups
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY problem_id, sort_order 
                    ORDER BY id
                ) as rn
                FROM problem_follow_ups
            ) sub
            WHERE rn > 1
        )
    """))
    op.create_unique_constraint('uq_problem_follow_ups_problem_sort_order', 'problem_follow_ups', ['problem_id', 'sort_order'])


def downgrade() -> None:
    op.drop_constraint('uq_problem_hints_problem_hint_num', 'problem_hints', type_='unique')
    op.drop_constraint('uq_problem_follow_ups_problem_sort_order', 'problem_follow_ups', type_='unique')
