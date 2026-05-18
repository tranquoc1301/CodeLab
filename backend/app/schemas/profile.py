from datetime import datetime

from pydantic import BaseModel, Field


class ErrorProfileTotals(BaseModel):
    recent_profiled_submissions: int
    lifetime_profiled_submissions: int


class ErrorProfileChartItem(BaseModel):
    code: str
    display_name: str
    recent_count: int
    lifetime_count: int


class ErrorProfileChart(BaseModel):
    labels: list[ErrorProfileChartItem] = Field(default_factory=list)


class ErrorProfileTopicStat(BaseModel):
    slug: str
    count: int


class ErrorProfileDetailStat(BaseModel):
    code: str
    display_name: str


class ErrorLabelProfileCard(BaseModel):
    code: str
    display_name: str
    recent_count: int
    lifetime_count: int
    recent_share: float
    trend_delta: int
    top_topics: list[ErrorProfileTopicStat] = Field(default_factory=list)
    top_detail: ErrorProfileDetailStat
    practice_focus: str


class ErrorProfileResponse(BaseModel):
    recent_window_days: int
    generated_at: datetime
    totals: ErrorProfileTotals
    chart: ErrorProfileChart
    top_labels: list[ErrorLabelProfileCard] = Field(default_factory=list)
