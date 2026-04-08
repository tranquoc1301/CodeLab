from datetime import datetime
from pydantic import BaseModel


# --- Topics ---


class TopicBase(BaseModel):
    name: str
    slug: str


class TopicCreate(TopicBase):
    pass


class TopicResponse(TopicBase):
    id: int

    model_config = {"from_attributes": True}


# --- Code Snippets ---


class CodeSnippetBase(BaseModel):
    language: str
    code: str


class CodeSnippetCreate(CodeSnippetBase):
    pass


class CodeSnippetResponse(CodeSnippetBase):
    id: int

    model_config = {"from_attributes": True}


# --- Examples ---


class ExampleBase(BaseModel):
    example_num: int
    example_text: str
    images: list[str] = []


class ExampleCreate(ExampleBase):
    pass


class ExampleResponse(ExampleBase):
    id: int

    model_config = {"from_attributes": True}


# --- Constraints ---


class ProblemConstraintBase(BaseModel):
    sort_order: int = 0
    constraint_text: str


class ProblemConstraintCreate(ProblemConstraintBase):
    pass


class ProblemConstraintResponse(ProblemConstraintBase):
    id: int

    model_config = {"from_attributes": True}


# --- Hints ---


class ProblemHintBase(BaseModel):
    hint_num: int
    hint_text: str


class ProblemHintCreate(ProblemHintBase):
    pass


class ProblemHintResponse(ProblemHintBase):
    id: int

    model_config = {"from_attributes": True}


# --- Follow-ups ---


class ProblemFollowUpBase(BaseModel):
    sort_order: int = 0
    follow_up_text: str


class ProblemFollowUpCreate(ProblemFollowUpBase):
    pass


class ProblemFollowUpResponse(ProblemFollowUpBase):
    id: int

    model_config = {"from_attributes": True}


# --- Solutions ---


class ProblemSolutionBase(BaseModel):
    content: str


class ProblemSolutionCreate(ProblemSolutionBase):
    pass


class ProblemSolutionResponse(ProblemSolutionBase):
    id: int
    problem_id: int

    model_config = {"from_attributes": True}


# --- Problems ---


class ProblemCreate(BaseModel):
    problem_id: int
    frontend_id: int
    title: str
    slug: str
    difficulty: str
    description: str | None = None
    topics: list[str] = []
    examples: list[ExampleCreate] = []
    constraints: list[ProblemConstraintCreate] = []
    hints: list[ProblemHintCreate] = []
    follow_ups: list[ProblemFollowUpCreate] = []
    code_snippets: list[CodeSnippetCreate] = []
    solution: str | None = None


class ProblemSummary(BaseModel):
    id: int
    problem_id: int
    frontend_id: int
    title: str
    slug: str
    difficulty: str
    topics: list[TopicResponse] = []

    model_config = {"from_attributes": True}


class ProblemResponse(BaseModel):
    id: int
    problem_id: int
    frontend_id: int
    title: str
    slug: str
    difficulty: str
    description: str | None
    topics: list[TopicResponse] = []
    examples: list[ExampleResponse] = []
    constraints: list[ProblemConstraintResponse] = []
    hints: list[ProblemHintResponse] = []
    follow_ups: list[ProblemFollowUpResponse] = []
    code_snippets: list[CodeSnippetResponse] = []
    solution: ProblemSolutionResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProblemListResponse(BaseModel):
    id: int
    problem_id: int
    frontend_id: int
    title: str
    slug: str
    difficulty: str
    topics: list[TopicResponse] = []

    model_config = {"from_attributes": True}


class ProblemListItem(BaseModel):
    id: int
    problem_id: int
    frontend_id: int
    title: str
    slug: str
    difficulty: str
    created_at: datetime
    topics: list[TopicResponse] = []
    is_solved: bool = False

    model_config = {"from_attributes": True}


class ProblemCursorResponse(BaseModel):
    items: list[ProblemListItem]
    next_cursor: str | None = None
    has_next: bool
    total_count: int | None = None
