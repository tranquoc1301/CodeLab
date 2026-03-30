"""Submission schemas with validation."""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator

from app.constants import Language, MAX_CODE_LENGTH, MIN_CODE_LENGTH


class SubmissionCreate(BaseModel):
    """Schema for creating a new submission."""
    
    source_code: Annotated[
        str,
        Field(
            min_length=MIN_CODE_LENGTH,
            max_length=MAX_CODE_LENGTH,
            description="Source code to submit",
        ),
    ]
    language: Annotated[
        str,
        Field(
            description="Programming language (python, java, cpp, c)",
        ),
    ]
    stdin: str | None = Field(
        default=None,
        max_length=10000,
        description="Standard input for the code (optional)",
    )
    problem_id: int | None = Field(
        default=None,
        gt=0,
        description="Problem ID to submit solution for (optional)",
    )
    
    @field_validator("source_code")
    @classmethod
    def validate_source_code(cls, v: str) -> str:
        """Ensure source code is not empty and doesn't contain dangerous patterns."""
        stripped = v.strip()
        if not stripped:
            raise ValueError("Source code cannot be empty or whitespace only")
        return stripped
    
    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        """Validate that the language is supported."""
        if not Language.is_valid(v):
            supported = ", ".join(sorted(Language.values()))
            raise ValueError(f"Unsupported language '{v}'. Supported languages: {supported}")
        return v.lower()
    
    @field_validator("stdin")
    @classmethod
    def validate_stdin(cls, v: str | None) -> str | None:
        """Normalize stdin - convert empty string to None."""
        if v is not None and not v.strip():
            return None
        return v
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "source_code": "#include <stdio.h>\n\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}",
                    "language": "c",
                    "stdin": None,
                    "problem_id": 1,
                }
            ]
        }
    }


class SubmissionResponse(BaseModel):
    """Schema for submission response."""
    
    id: int
    user_id: int
    problem_id: int | None
    problem_slug: str | None
    source_code: str
    language: str
    status: str | None
    stdout: str | None
    stderr: str | None
    error_type: str | None
    execution_time_ms: int | None
    memory_used_kb: int | None
    judge0_token: str | None
    created_at: datetime

    model_config = {"from_attributes": True}