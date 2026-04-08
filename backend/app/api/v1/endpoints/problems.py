"""Problem API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, oauth2_scheme
from app.core.database import get_db
from app.models.problem import Problem, Topic
from app.models.user import User
from app.schemas.problem import (
    ProblemCreate,
    ProblemCursorResponse,
    ProblemListResponse,
    ProblemResponse,
    TopicResponse,
)
from app.services import problems as problem_service

router = APIRouter(prefix="/problems", tags=["problems"])


async def get_optional_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Get current user if authenticated, otherwise return None."""
    if token is None:
        return None
    try:
        return await get_current_user(token=token, db=db)
    except HTTPException:
        return None


@router.get("/paginated", response_model=ProblemCursorResponse)
async def list_problems_paginated(
    search: str | None = Query(
        None, description="Search by problem title (case-insensitive)"
    ),
    difficulty: str | None = Query(
        None, description="Filter by difficulty: Easy, Medium, Hard"
    ),
    topics: list[str] | None = Query(None, description="Filter by topic slugs"),
    sort_by: str = Query(
        "newest", description="Sort: newest, oldest, frontend_id, title"
    ),
    cursor: str | None = Query(None, description="Cursor for pagination"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
) -> ProblemCursorResponse:
    """List problems with cursor-based pagination and optional filters."""
    user_id = current_user.id if current_user else None
    return await problem_service.get_problems_paginated(
        db=db,
        search=search,
        difficulty=difficulty,
        topics=topics,
        sort_by=sort_by,
        cursor=cursor,
        limit=limit,
        user_id=user_id,
    )


@router.get("/topics", response_model=list[TopicResponse])
async def list_topics(
    db: AsyncSession = Depends(get_db),
) -> list[Topic]:
    """List all problem topics."""
    return await problem_service.get_all_topics(db)


@router.get("/", response_model=list[ProblemListResponse])
async def list_problems(
    difficulty: str | None = Query(None, description="Filter by difficulty"),
    topic: str | None = Query(None, description="Filter by topic slug"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[Problem]:
    """List problems with offset-based pagination."""
    return await problem_service.get_problems_list(
        db=db,
        difficulty=difficulty,
        topic=topic,
        limit=limit,
        offset=offset,
    )


@router.get("/by-slug/{slug}", response_model=ProblemResponse)
async def get_problem_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> Problem:
    """Get a single problem by its slug."""
    problem = await problem_service.get_problem_by_slug(db, slug)
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found",
        )
    return problem


@router.get("/navigation/{slug}", response_model=dict)
async def get_problem_navigation_info(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get prev/next problem navigation info for a given problem."""
    problem = await problem_service.get_problem_by_slug(db, slug)
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found",
        )
    return await problem_service.get_problem_navigation(db, problem.frontend_id)


@router.get("/redirect/{problem_id}", response_model=dict)
async def redirect_id_to_slug(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Redirect a numeric problem ID to its slug."""
    problem = await problem_service.get_problem_by_id(db, problem_id)
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found",
        )
    return {"slug": problem.slug}


@router.post("/", response_model=ProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    problem_data: ProblemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Problem:
    """Create a new problem (authenticated)."""
    from sqlalchemy import select

    problem = Problem(
        problem_id=problem_data.problem_id,
        frontend_id=problem_data.frontend_id,
        title=problem_data.title,
        slug=problem_data.slug,
        difficulty=problem_data.difficulty,
        description=problem_data.description,
    )
    db.add(problem)
    await db.flush()

    for topic_name in problem_data.topics:
        topic_slug = topic_name.lower().replace(" ", "-")
        result = await db.execute(select(Topic).where(Topic.slug == topic_slug))
        topic = result.scalar_one_or_none()
        if not topic:
            topic = Topic(name=topic_name, slug=topic_slug)
            db.add(topic)
            await db.flush()
        problem.topics.append(topic)

    await db.commit()
    await db.refresh(problem)
    return problem
