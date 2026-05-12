from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
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
    submission_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("submissions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # One hint row per submission
    )
    current_level: Mapped[int] = mapped_column(
        SmallInteger,
        default=0,
        nullable=False,
    )
    hint_1: Mapped[str | None] = mapped_column(Text, nullable=True)
    hint_2: Mapped[str | None] = mapped_column(Text, nullable=True)
    hint_3: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_1: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    payload_2: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    payload_3: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    last_error_label: Mapped[str | None] = mapped_column(String(64), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
