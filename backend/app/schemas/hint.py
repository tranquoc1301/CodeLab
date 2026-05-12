from typing import Literal

from pydantic import BaseModel


class HintCard(BaseModel):
    label: str
    content: str


class HintResponse(BaseModel):
    hint: str | None
    hint_level: int
    exhausted: bool
    stage: Literal["observe", "focus", "correct"]
    diagnosis_label: str | None
    diagnosis_detail: str | None = None
    cards: list[HintCard]
