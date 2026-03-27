from datetime import datetime
from pydantic import BaseModel


class ProblemCreate(BaseModel):
    title: str
    description: str
    difficulty: str
    skill_tags: list[str] = []
    sample_input: str | None = None
    sample_output: str | None = None


class ProblemResponse(BaseModel):
    id: int
    title: str
    description: str
    difficulty: str
    skill_tags: list[str]
    sample_input: str | None
    sample_output: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
