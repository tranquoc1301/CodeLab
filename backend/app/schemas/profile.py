from datetime import datetime

from pydantic import BaseModel, Field

from app.services.hint_diagnostics import CanonicalErrorLabel


class ErrorProfileTotals(BaseModel):
    recent_profiled_submissions: int
    all_time_profiled_submissions: int
    active_error_labels: int
    active_topics: int


class ErrorProfileTopicStat(BaseModel):
    slug: str
    recent_count: int
    all_time_count: int


class ErrorProfileLabelStat(BaseModel):
    code: CanonicalErrorLabel
    display_name: str
    recent_count: int
    all_time_count: int
    recent_share: float
    related_topics: list[ErrorProfileTopicStat] = Field(default_factory=list)


class ErrorProfileTopicCard(BaseModel):
    slug: str
    recent_count: int
    all_time_count: int
    top_error_labels: list[ErrorProfileLabelStat] = Field(default_factory=list)


class ErrorProfileResponse(BaseModel):
    recent_window_days: int
    generated_at: datetime
    totals: ErrorProfileTotals
    top_error_labels: list[ErrorProfileLabelStat] = Field(default_factory=list)
    top_topics: list[ErrorProfileTopicCard] = Field(default_factory=list)
