"""Pydantic schemas for the LLM hint feature."""

from pydantic import BaseModel


class HintResponse(BaseModel):
    """Response model for hint requests.
    
    Attributes:
        hint: The generated hint text, or None when exhausted
        hint_level: The level just delivered (1, 2, or 3)
        exhausted: True when hint_level == 3 (no more hints available)
    """
    hint: str | None
    hint_level: int
    exhausted: bool
