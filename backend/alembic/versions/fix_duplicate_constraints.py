"""fix duplicate constraints"""
from alembic import op
import sqlalchemy as sa

revision = 'fix_duplicate_constraints'
down_revision = '01fafbb282a5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    
    conn.execute(sa.text("""
        DELETE FROM problem_constraints
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY problem_id, sort_order 
                    ORDER BY id
                ) as rn
                FROM problem_constraints
            ) sub
            WHERE rn > 1
        )
    """))
    
    op.create_unique_constraint('uq_problem_constraints_problem_sort_order', 'problem_constraints', ['problem_id', 'sort_order'])


def downgrade() -> None:
    op.drop_constraint('uq_problem_constraints_problem_sort_order', 'problem_constraints', type_='unique')
