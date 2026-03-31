from datetime import datetime
import time

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.problem import Problem, Topic, ProblemTopic
from app.models.user import User
from app.schemas.problem import (
    ProblemCreate,
    ProblemResponse,
    ProblemListResponse,
    ProblemListItem,
    ProblemCursorResponse,
    TopicResponse,
)
from app.api.routes.auth import get_current_user
from app.services.cache import get_cached, set_cached, generate_cache_key, invalidate_cache
from app.services.cursor import encode_cursor, decode_cursor, parse_sort_params

router = APIRouter(prefix="/problems", tags=["problems"])


@router.get("/paginated", response_model=ProblemCursorResponse)
async def list_problems_paginated(
    difficulty: str | None = Query(None, description="Filter by difficulty: Easy, Medium, Hard"),
    topic: str | None = Query(None, description="Filter by topic slug"),
    sort_by: str = Query("newest", description="Sort order: newest, oldest, frontend_id, title"),
    cursor: str | None = Query(None, description="Cursor for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Number of items per page"),
    db: AsyncSession = Depends(get_db),
):
    order_col, descending = parse_sort_params(sort_by)
    
    cache_params = {
        "difficulty": difficulty,
        "topic": topic,
        "sort_by": sort_by,
        "cursor": cursor,
        "limit": limit,
    }
    cache_key = generate_cache_key("problems:paginated", cache_params)
    
    if not cursor:
        cached = await get_cached(cache_key)
        if cached:
            return cached
    
    cursor_data = decode_cursor(cursor)
    
    query = select(Problem).options(selectinload(Problem.topics))
    
    if difficulty:
        query = query.where(Problem.difficulty == difficulty)
    if topic:
        query = query.join(ProblemTopic).join(Topic).where(Topic.slug == topic)
    
    if cursor_data:
        last_id = cursor_data.get("id")
        last_val = cursor_data.get("val")
        
        if order_col == "created_at" and last_val:
            last_created = datetime.fromisoformat(last_val)
            if descending:
                query = query.where(
                    (Problem.created_at < last_created) |
                    ((Problem.created_at == last_created) & (Problem.id < last_id))
                )
            else:
                query = query.where(
                    (Problem.created_at > last_created) |
                    ((Problem.created_at == last_created) & (Problem.id > last_id))
                )
        elif order_col == "frontend_id" and last_val:
            last_frontend_id = int(last_val)
            if descending:
                query = query.where(
                    (Problem.frontend_id < last_frontend_id) |
                    ((Problem.frontend_id == last_frontend_id) & (Problem.id < last_id))
                )
            else:
                query = query.where(
                    (Problem.frontend_id > last_frontend_id) |
                    ((Problem.frontend_id == last_frontend_id) & (Problem.id > last_id))
                )
        elif order_col == "title" and last_val:
            if descending:
                query = query.where(
                    (Problem.title < last_val) |
                    ((Problem.title == last_val) & (Problem.id < last_id))
                )
            else:
                query = query.where(
                    (Problem.title > last_val) |
                    ((Problem.title == last_val) & (Problem.id > last_id))
                )
    
    if descending:
        query = query.order_by(getattr(Problem, order_col).desc(), Problem.id.desc())
    else:
        query = query.order_by(getattr(Problem, order_col).asc(), Problem.id.asc())
    
    query = query.limit(limit + 1)
    result = await db.execute(query)
    problems = result.scalars().unique().all()
    
    has_next = len(problems) > limit
    if has_next:
        problems = problems[:limit]
    
    count_query = select(func.count(Problem.id))
    if difficulty:
        count_query = count_query.where(Problem.difficulty == difficulty)
    if topic:
        count_query = count_query.join(ProblemTopic).join(Topic).where(Topic.slug == topic)
    count_result = await db.execute(count_query)
    total_count = count_result.scalar() or 0
    
    next_cursor = None
    if has_next and problems:
        last_problem = problems[-1]
        if order_col == "created_at":
            last_val = last_problem.created_at.isoformat()
        elif order_col == "title":
            last_val = last_problem.title
        else:
            last_val = str(getattr(last_problem, order_col))
        next_cursor = encode_cursor(sort_by, last_problem.id, last_val)
    
    response = ProblemCursorResponse(
        items=[ProblemListItem.model_validate(p) for p in problems],
        next_cursor=next_cursor,
        has_next=has_next,
        total_count=total_count if not cursor else None,
    )
    
    if not cursor:
        await set_cached(cache_key, response.model_dump(mode="json"))
    
    return response


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
