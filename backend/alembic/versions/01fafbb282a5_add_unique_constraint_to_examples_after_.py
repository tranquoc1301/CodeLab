"""add unique constraint to examples after cleanup"""
from alembic import op
import sqlalchemy as sa

revision = '01fafbb282a5'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # Delete duplicate examples, keeping the first one (lowest id) for each problem_id + example_num
    conn.execute(sa.text("""
        DELETE FROM examples
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY problem_id, example_num 
                    ORDER BY id
                ) as rn
                FROM examples
            ) sub
            WHERE rn > 1
        )
    """))
    
    # Create unique constraint
    op.create_unique_constraint('uq_examples_problem_example_num', 'examples', ['problem_id', 'example_num'])


def downgrade() -> None:
    op.drop_constraint('uq_examples_problem_example_num', 'examples', type_='unique')
