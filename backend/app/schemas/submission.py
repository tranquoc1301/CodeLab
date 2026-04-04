"""Submission schemas with LeetCode-style verdict response."""

from datetime import datetime
from typing import Annotated, List, Optional

from pydantic import BaseModel, Field, field_validator

from app.constants import Language, MAX_CODE_LENGTH, MIN_CODE_LENGTH


class TestCaseResult(BaseModel):
    """Result for a single test case."""

    index: int = Field(description="Test case index (0-based)")
    status: str = Field(
        description="Test case status: Accepted, Wrong Answer, Runtime Error, etc."
    )
    input: str = Field(default="", description="Test case input (stdin)")
    stdout: str = Field(default="", description="Captured stdout")
    stderr: str = Field(default="", description="Captured stderr")
    expected_output: str = Field(
        default="", description="Expected output for this test case"
    )
    error_message: Optional[str] = Field(
        default=None, description="Error message if failed"
    )
    time_ms: Optional[int] = Field(
        default=None, description="Execution time in milliseconds"
    )
    memory_kb: Optional[int] = Field(default=None, description="Memory usage in KB")


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
            description="Programming language (python3, java, cpp, c)",
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
    submission_type: str | None = Field(
        default=None,
        description="Submission type: 'run' (sample only) or 'submit' (all test cases)",
    )

    @field_validator("source_code")
    @classmethod
    def validate_source_code(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Source code cannot be empty or whitespace only")
        return stripped

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        if not Language.is_valid(v):
            supported = ", ".join(sorted(Language.values()))
            raise ValueError(
                f"Unsupported language '{v}'. Supported languages: {supported}"
            )
        return v.lower()

    @field_validator("stdin")
    @classmethod
    def validate_stdin(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            return None
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "source_code": "class Solution:\n    def twoSum(self, nums, target):\n        seen = {}\n        for i, n in enumerate(nums):\n            if target - n in seen:\n                return [seen[target - n], i]\n            seen[n] = i",
                    "language": "python3",
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
    passed_count: int | None
    total_count: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class VerdictResponse(BaseModel):
    """LeetCode-style verdict response for a submission."""

    status: str = Field(
        description='Final verdict: "Accepted", "Wrong Answer", "Runtime Error", '
        '"Time Limit Exceeded", "Memory Limit Exceeded", "Compile Error"'
    )
    passed_test_cases: int = Field(description="Number of test cases that passed")
    total_test_cases: int = Field(description="Total number of test cases")
    runtime_ms: int | None = Field(
        default=None,
        description="Maximum execution time in ms across all test cases",
    )
    memory_kb: int | None = Field(
        default=None,
        description="Peak memory usage in KB during execution",
    )
    last_test_case_output: str | None = Field(
        default=None,
        description="Actual output from the first failing test case (or last if all passed), truncated to 500 chars",
    )
    expected_output: str | None = Field(
        default=None,
        description="Expected output for the first failing test case, truncated to 500 chars",
    )
    error_message: str | None = Field(
        default=None,
        description="User-friendly error message describing the failure",
    )
    stdin: str = Field(
        default="",
        description="Input for the first failing test case",
    )
    stdout: str = Field(
        default="",
        description="Captured stdout from the first failing test case",
    )
    stderr: str = Field(
        default="",
        description="Captured stderr from the first failing test case",
    )
    test_case_results: List[TestCaseResult] = Field(
        default_factory=list,
        description="Per-test-case results including status, time, and memory",
    )
