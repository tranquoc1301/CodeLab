"""drop error annotation tables

Revision ID: drop_error_annotations
Revises: add_error_annotations
Create Date: 2026-05-02 11:05:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "drop_error_annotations"
down_revision: str | None = "add_error_annotations"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """Drop error annotation tables."""
    # Drop submission_error_annotations first (has FK to error_labels)
    op.execute("DROP TABLE IF EXISTS submission_error_annotations CASCADE")
    # Then drop error_labels
    op.execute("DROP TABLE IF EXISTS error_labels CASCADE")


def downgrade() -> None:
    """Recreate error annotation tables."""
    # Create error_labels table
    op.execute("""
        CREATE TABLE error_labels (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            display_name VARCHAR(100) NOT NULL
        );
    """)

    # Create submission_error_annotations table with constraints
    op.execute("""
        CREATE TABLE submission_error_annotations (
            id SERIAL PRIMARY KEY,
            submission_id INTEGER NOT NULL,
            error_label_id INTEGER NOT NULL,
            label_source VARCHAR(20) NOT NULL,
            confidence NUMERIC(5,4),
            annotator_user_id INTEGER,
            note TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            CONSTRAINT fk_submission_error_annotations_submission
                FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
            CONSTRAINT fk_submission_error_annotations_error_label
                FOREIGN KEY (error_label_id) REFERENCES error_labels(id) ON DELETE CASCADE,
            CONSTRAINT fk_submission_error_annotations_annotator
                FOREIGN KEY (annotator_user_id) REFERENCES users(id) ON DELETE SET NULL,
            CONSTRAINT uq_submission_error_annotation
                UNIQUE (submission_id, error_label_id, label_source)
        );
    """)

    # Create indexes on foreign key columns
    op.execute("""
        CREATE INDEX ix_submission_error_annotations_submission_id
        ON submission_error_annotations(submission_id);
    """)
    op.execute("""
        CREATE INDEX ix_submission_error_annotations_error_label_id
        ON submission_error_annotations(error_label_id);
    """)
