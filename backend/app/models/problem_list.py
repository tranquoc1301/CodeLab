from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.problem import Problem
    from app.models.user import User


class ProblemList(Base):
    __tablename__ = "problem_lists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
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

    user: Mapped[User] = relationship(
        "User",
        back_populates="problem_lists",
        lazy="selectin",
    )
    items: Mapped[list[ProblemListItem]] = relationship(
        back_populates="problem_list",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ProblemListItem(Base):
    __tablename__ = "problem_list_items"
    __table_args__ = (
        Index("ix_problem_list_items_list_problem", "problem_list_id", "problem_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    problem_list_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("problem_lists.id", ondelete="CASCADE"),
        nullable=False,
    )
    problem_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("problems.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    problem_list: Mapped[ProblemList] = relationship(
        "ProblemList",
        back_populates="items",
        lazy="selectin",
    )
    problem: Mapped[Problem] = relationship(
        "Problem",
        back_populates="problem_list_items",
        lazy="selectin",
    )
