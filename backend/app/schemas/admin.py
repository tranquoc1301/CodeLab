"""Admin-facing Pydantic schemas for problem, topic, user, and submission management."""

from datetime import datetime
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

from app.schemas.problem import TopicResponse

T = TypeVar("T")


# --- Generic paginated response ---


class AdminPaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    has_next: bool


# --- Admin Problem ---


class AdminProblemBase(BaseModel):
    problem_id: int = Field(..., gt=0, description="External problem ID (e.g. LeetCode)")
    frontend_id: int = Field(..., gt=0, description="Display ID")
    title: str = Field(..., min_length=1, max_length=300)
    slug: str = Field(..., min_length=1, max_length=300)
    difficulty: str = Field(..., pattern="^(Easy|Medium|Hard)$")
    description: Optional[str] = None
    topics: List[str] = Field(default_factory=list)


class AdminProblemCreate(AdminProblemBase):
    pass


class AdminProblemUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=300)
    slug: Optional[str] = Field(default=None, min_length=1, max_length=300)
    difficulty: Optional[str] = Field(default=None, pattern="^(Easy|Medium|Hard)$")
    description: Optional[str] = None
    topics: Optional[List[str]] = None


class AdminProblemListItem(BaseModel):
    id: int
    problem_id: int
    frontend_id: int
    title: str
    slug: str
    difficulty: str
    topics: List[TopicResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AdminProblemDetail(BaseModel):
    id: int
    problem_id: int
    frontend_id: int
    title: str
    slug: str
    difficulty: str
    description: Optional[str] = None
    topics: List[TopicResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Admin Topic ---


class AdminTopicCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: Optional[str] = Field(default=None, max_length=100)


class AdminTopicUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    slug: Optional[str] = Field(default=None, max_length=100)


class AdminTopicItem(BaseModel):
    id: int
    name: str
    slug: str
    problem_count: int = 0
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Admin User ---


class AdminUserItem(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime
    submission_count: int = 0

    model_config = {"from_attributes": True}


# --- Admin Submission ---


class AdminSubmissionItem(BaseModel):
    id: int
    user_id: int
    username: Optional[str] = None
    problem_id: Optional[int] = None
    problem_slug: Optional[str] = None
    problem_title: Optional[str] = None
    language: str
    status: Optional[str] = None
    execution_time_ms: Optional[int] = None
    memory_used_kb: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Admin Stats ---


class AdminStats(BaseModel):
    problems: int
    topics: int
    users: int
    submissions: int


class DistributionItem(BaseModel):
    label: str
    value: int
    color: str | None = None


class AdminExtendedStats(BaseModel):
    problems: int
    topics: int
    users: int
    submissions: int
    active_users: int
    admin_users: int
    difficulty_distribution: list[DistributionItem]
    status_distribution: list[DistributionItem]
    error_label_distribution: list[DistributionItem]
    top_topics: list[AdminTopicItem]
    recent_problems: list[AdminProblemListItem]
    recent_submissions: list[AdminSubmissionItem]
