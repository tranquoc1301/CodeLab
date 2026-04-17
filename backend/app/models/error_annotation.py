"""Error annotation models for classifying submission failures."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.submission import Submission
    from app.models.user import User


class ErrorLabel(Base):
    """Reference table for error classification labels."""

    __tablename__ = "error_labels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationship back to annotations
    annotations: Mapped[list["ErrorAnnotation"]] = relationship(
        back_populates="label",
        cascade="all, delete-orphan",
    )


class ErrorAnnotation(Base):
    """Links a submission to an error label with confidence and source metadata."""

    __tablename__ = "submission_error_annotations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    submission_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("submissions.id", ondelete="CASCADE"),
        nullable=False,
    )
    error_label_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("error_labels.id", ondelete="CASCADE"),
        nullable=False,
    )
    label_source: Mapped[str] = mapped_column(String(20), nullable=False)
    confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))
    annotator_user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    submission: Mapped["Submission"] = relationship(
        back_populates="error_annotations",
    )
    label: Mapped["ErrorLabel"] = relationship(
        back_populates="annotations",
    )
    annotator: Mapped["User | None"] = relationship("User")

    __table_args__ = (
        UniqueConstraint(
            "submission_id",
            "error_label_id",
            "label_source",
            name="uq_submission_error_annotation",
        ),
    )
