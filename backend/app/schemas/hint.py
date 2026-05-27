from pydantic import BaseModel


class HintResponse(BaseModel):
    error_code: str | None = None
    level: int
    items: list[str]
