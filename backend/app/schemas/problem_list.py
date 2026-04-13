from datetime import datetime
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, Field, model_validator

from app.schemas.problem import ProblemSummary

if TYPE_CHECKING:
    from app.models.problem_list import ProblemList


class ProblemListBase(BaseModel):
    name: str = Field(max_length=100)
    description: str | None = None


class ProblemListCreate(ProblemListBase):
    pass


class ProblemListUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    description: str | None = None


class ProblemListResponse(ProblemListBase):
    id: int
    user_id: int
    problem_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def compute_problem_count(cls, data: Any) -> Any:
        """Compute problem_count from ORM model items relationship."""
        if hasattr(data, "__dict__"):
            # It's an ORM object
            items = getattr(data, "items", [])
            return {
                "id": data.id,
                "name": data.name,
                "description": data.description,
                "user_id": data.user_id,
                "problem_count": len(items) if items else 0,
                "created_at": data.created_at,
                "updated_at": data.updated_at,
            }
        return data


class ProblemListItemResponse(BaseModel):
    problem_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ProblemListProblemsResponse(BaseModel):
    problems: list[ProblemSummary]
    total_count: int


class ProblemListSimple(BaseModel):
    """Simple schema for listing problem lists (id, name only)."""

    id: int
    name: str

    model_config = {"from_attributes": True}
