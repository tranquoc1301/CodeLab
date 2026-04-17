"""add error annotation tables

Revision ID: add_error_annotations
Revises: c359d4c89796
Create Date: 2026-04-16 19:30:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "add_error_annotations"
down_revision: str | None = "c359d4c89796"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """Create error_labels and submission_error_annotations tables."""

    # Create error_labels table
    op.execute("""
        CREATE TABLE IF NOT EXISTS error_labels (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            display_name VARCHAR(100) NOT NULL
        );
    """)

    # Create submission_error_annotations table with constraints
    op.execute("""
        CREATE TABLE IF NOT EXISTS submission_error_annotations (
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

    # Create indexes on foreign key columns for query performance
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_submission_error_annotations_submission_id
        ON submission_error_annotations(submission_id);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_submission_error_annotations_error_label_id
        ON submission_error_annotations(error_label_id);
    """)


def downgrade() -> None:
    """Drop error annotation tables."""
    op.execute("DROP TABLE IF EXISTS submission_error_annotations CASCADE")
    op.execute("DROP TABLE IF EXISTS error_labels CASCADE")
