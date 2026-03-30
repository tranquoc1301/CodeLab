from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.problem import Problem, Topic, ProblemTopic
from app.models.user import User
from app.schemas.problem import (
    ProblemCreate,
    ProblemResponse,
    ProblemListResponse,
    TopicResponse,
)
from app.api.routes.auth import get_current_user

router = APIRouter(prefix="/problems", tags=["problems"])


@router.get("/", response_model=list[ProblemListResponse])
async def list_problems(
    difficulty: str | None = Query(None, description="Filter by difficulty: Easy, Medium, Hard"),
    topic: str | None = Query(None, description="Filter by topic slug"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Problem)
        .options(selectinload(Problem.topics))
        .order_by(Problem.frontend_id)
    )
    if difficulty:
        query = query.where(Problem.difficulty == difficulty)
    if topic:
        query = query.join(ProblemTopic).join(Topic).where(Topic.slug == topic)

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/by-slug/{slug}", response_model=ProblemResponse)
async def get_problem_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Problem)
        .options(
            selectinload(Problem.topics),
            selectinload(Problem.examples),
            selectinload(Problem.constraints),
            selectinload(Problem.hints),
            selectinload(Problem.follow_ups),
            selectinload(Problem.code_snippets),
            selectinload(Problem.solution),
        )
        .where(Problem.slug == slug)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    return problem


@router.get("/redirect/{problem_id}", response_model=dict)
async def redirect_id_to_slug(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Problem).where(Problem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    return {"slug": problem.slug}


@router.post("/", response_model=ProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    problem_data: ProblemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    # Handle topics
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
