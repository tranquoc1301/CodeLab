from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.submission import Submission
    from app.models.user import User


class SubmissionErrorEvent(Base):
    __tablename__ = "submission_error_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    submission_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("submissions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    problem_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("problems.id", ondelete="SET NULL"),
        nullable=True,
    )
    error_label: Mapped[str] = mapped_column(String(64), nullable=False)
    diagnosis_detail: Mapped[str] = mapped_column(String(64), nullable=False)
    problem_difficulty: Mapped[str | None] = mapped_column(String(16), nullable=True)
    topic_slugs: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    submission_created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
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

    __table_args__ = (
        UniqueConstraint("submission_id", name="uq_submission_error_events_submission_id"),
    )

    submission: Mapped["Submission"] = relationship(back_populates="error_event")
    user: Mapped["User"] = relationship(back_populates="error_events")
