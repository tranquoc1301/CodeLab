from datetime import datetime
from pydantic import BaseModel


class SubmissionCreate(BaseModel):
    source_code: str
    language: str
    stdin: str | None = None
    problem_id: int | None = None


class SubmissionResponse(BaseModel):
    id: int
    user_id: int
    problem_id: int | None
    source_code: str
    language: str
    status: str | None
    stdout: str | None
    stderr: str | None
    error_type: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
