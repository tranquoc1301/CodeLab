"""Submission and submission test result models."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.error_annotation import ErrorAnnotation


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    problem_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("problems.id", ondelete="SET NULL"),
    )
    source_code: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str | None] = mapped_column(String(50))
    stdout: Mapped[str | None] = mapped_column(Text)
    stderr: Mapped[str | None] = mapped_column(Text)
    error_type: Mapped[str | None] = mapped_column(String(50))
    execution_time_ms: Mapped[int | None] = mapped_column(Integer)
    memory_used_kb: Mapped[int | None] = mapped_column(Integer)
    judge0_token: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    submission_type: Mapped[str | None] = mapped_column(
        String(10),
        default="submit",
    )
    passed_count: Mapped[int | None] = mapped_column(Integer)
    total_count: Mapped[int | None] = mapped_column(Integer)

    user: Mapped["User"] = relationship(back_populates="submissions")
    problem: Mapped["Problem | None"] = relationship(back_populates="submissions")
    test_results: Mapped[list["SubmissionTestResult"]] = relationship(
        back_populates="submission",
        cascade="all, delete-orphan",
    )
    error_annotations: Mapped[list["ErrorAnnotation"]] = relationship(
        back_populates="submission",
        cascade="all, delete-orphan",
    )


class SubmissionTestResult(Base):
    """Per-test-case result for a submission."""

    __tablename__ = "submission_test_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    submission_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("submissions.id", ondelete="CASCADE"),
        nullable=False,
    )
    test_case_id: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    stdout: Mapped[str | None] = mapped_column(Text)
    expected_output: Mapped[str | None] = mapped_column(Text)
    stdin: Mapped[str | None] = mapped_column(Text)
    execution_time_ms: Mapped[int | None] = mapped_column(Integer)
    memory_used_kb: Mapped[int | None] = mapped_column(Integer)
    judge0_token: Mapped[str | None] = mapped_column(String(100))

    submission: Mapped["Submission"] = relationship(back_populates="test_results")
