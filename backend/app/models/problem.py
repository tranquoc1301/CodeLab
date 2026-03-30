from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Text, Boolean, ForeignKey, UniqueConstraint,
    func, CheckConstraint
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base


class Problem(Base):
    __tablename__ = "problems"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    problem_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    frontend_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    slug: Mapped[str] = mapped_column(String(300), unique=True, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(10), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("difficulty IN ('Easy', 'Medium', 'Hard')", name="ck_problems_difficulty"),
    )

    # Relationships
    topics: Mapped[list["Topic"]] = relationship(
        secondary="problem_topics", back_populates="problems", lazy="selectin"
    )
    examples: Mapped[list["Example"]] = relationship(
        back_populates="problem", cascade="all, delete-orphan", lazy="selectin"
    )
    constraints: Mapped[list["ProblemConstraint"]] = relationship(
        back_populates="problem", cascade="all, delete-orphan", lazy="selectin",
        order_by="ProblemConstraint.sort_order"
    )
    hints: Mapped[list["ProblemHint"]] = relationship(
        back_populates="problem", cascade="all, delete-orphan", lazy="selectin",
        order_by="ProblemHint.hint_num"
    )
    follow_ups: Mapped[list["ProblemFollowUp"]] = relationship(
        back_populates="problem", cascade="all, delete-orphan", lazy="selectin",
        order_by="ProblemFollowUp.sort_order"
    )
    code_snippets: Mapped[list["CodeSnippet"]] = relationship(
        back_populates="problem", cascade="all, delete-orphan", lazy="selectin"
    )
    solution: Mapped["ProblemSolution | None"] = relationship(
        back_populates="problem", cascade="all, delete-orphan", uselist=False, lazy="selectin"
    )
    submissions: Mapped[list["Submission"]] = relationship(
        back_populates="problem", lazy="dynamic"
    )


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    # Relationships
    problems: Mapped[list["Problem"]] = relationship(
        secondary="problem_topics", back_populates="topics", lazy="selectin"
    )


class ProblemTopic(Base):
    __tablename__ = "problem_topics"

    problem_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="CASCADE"), primary_key=True
    )
    topic_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True
    )


class Example(Base):
    __tablename__ = "examples"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    problem_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False
    )
    example_num: Mapped[int] = mapped_column(Integer, nullable=False)
    example_text: Mapped[str] = mapped_column(Text, nullable=False)
    images: Mapped[list] = mapped_column(JSONB, default=list)

    __table_args__ = (
        UniqueConstraint("problem_id", "example_num", name="uq_examples_problem_example_num"),
    )

    # Relationships
    problem: Mapped["Problem"] = relationship(back_populates="examples")


class ProblemConstraint(Base):
    __tablename__ = "problem_constraints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    problem_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    constraint_text: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint("problem_id", "sort_order", name="uq_problem_constraints_problem_sort_order"),
    )

    # Relationships
    problem: Mapped["Problem"] = relationship(back_populates="constraints")


class ProblemHint(Base):
    __tablename__ = "problem_hints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    problem_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False
    )
    hint_num: Mapped[int] = mapped_column(Integer, nullable=False)
    hint_text: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint("problem_id", "hint_num", name="uq_problem_hints_problem_hint_num"),
    )

    # Relationships
    problem: Mapped["Problem"] = relationship(back_populates="hints")


class ProblemFollowUp(Base):
    __tablename__ = "problem_follow_ups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    problem_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    follow_up_text: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint("problem_id", "sort_order", name="uq_problem_follow_ups_problem_sort_order"),
    )

    # Relationships
    problem: Mapped["Problem"] = relationship(back_populates="follow_ups")


class CodeSnippet(Base):
    __tablename__ = "code_snippets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    problem_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False
    )
    language: Mapped[str] = mapped_column(String(30), nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint("problem_id", "language", name="uq_code_snippets_problem_lang"),
    )

    # Relationships
    problem: Mapped["Problem"] = relationship(back_populates="code_snippets")


class ProblemSolution(Base):
    __tablename__ = "problem_solutions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    problem_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    problem: Mapped["Problem"] = relationship(back_populates="solution")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    submissions: Mapped[list["Submission"]] = relationship(
        back_populates="user", lazy="dynamic"
    )


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    problem_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="SET NULL")
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
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="submissions")
    problem: Mapped["Problem | None"] = relationship(back_populates="submissions")
