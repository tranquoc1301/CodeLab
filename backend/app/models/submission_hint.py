"""Submission hint model for tracking progressive LLM hints per user-problem pair."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, SmallInteger, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SubmissionHint(Base):
    """Tracks hint progress and cached hints for a user on a specific problem."""

    __tablename__ = "submission_hints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    problem_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("problems.id", ondelete="CASCADE"),
        nullable=False,
    )
    current_level: Mapped[int] = mapped_column(
        SmallInteger,
        default=0,
        nullable=False,
    )
    hint_1: Mapped[str | None] = mapped_column(Text, nullable=True)
    hint_2: Mapped[str | None] = mapped_column(Text, nullable=True)
    hint_3: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_error_label: Mapped[str | None] = mapped_column(String(64), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "problem_id",
            name="uq_submission_hints_user_problem",
        ),
    )
