"""Problem service for business logic operations."""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.problem import Problem, ProblemTopic, Topic
from app.models.submission import Submission
from app.schemas.problem import (
    ProblemCursorResponse,
    ProblemListItem,
    ProblemListResponse,
)
from app.services.cache import (
    generate_cache_key,
    get_cached,
    invalidate_cache,
    set_cached,
)
from app.services.cursor import decode_cursor, encode_cursor, parse_sort_params


def _build_problems_cache_key(
    search: str | None,
    difficulty: str | None,
    topics: list[str] | None,
    sort_by: str,
    cursor: str | None,
    limit: int,
    user_id: int | None,
) -> str:
    """Build cache key for paginated problems query."""
    cache_params = {
        "search": search,
        "difficulty": difficulty,
        "topics": topics,
        "sort_by": sort_by,
        "cursor": cursor,
        "limit": limit,
        "user_id": user_id,
    }
    return generate_cache_key("problems:paginated", cache_params)


async def get_problem_navigation(
    db: AsyncSession,
    current_frontend_id: int,
) -> dict:
    """Get prev/next problem info for navigation buttons."""
    # Previous problem: highest frontend_id below current
    prev_query = (
        select(Problem.frontend_id, Problem.title, Problem.slug)
        .where(Problem.frontend_id < current_frontend_id)
        .order_by(Problem.frontend_id.desc())
        .limit(1)
    )
    prev_result = await db.execute(prev_query)
    prev_row = prev_result.first()

    # Next problem: lowest frontend_id above current
    next_query = (
        select(Problem.frontend_id, Problem.title, Problem.slug)
        .where(Problem.frontend_id > current_frontend_id)
        .order_by(Problem.frontend_id.asc())
        .limit(1)
    )
    next_result = await db.execute(next_query)
    next_row = next_result.first()

    return {
        "prev": {
            "frontend_id": prev_row[0],
            "title": prev_row[1],
            "slug": prev_row[2],
        }
        if prev_row
        else None,
        "next": {
            "frontend_id": next_row[0],
            "title": next_row[1],
            "slug": next_row[2],
        }
        if next_row
        else None,
    }


async def get_problems_paginated(
    db: AsyncSession,
    search: str | None = None,
    difficulty: str | None = None,
    topics: list[str] | None = None,
    sort_by: str = "newest",
    cursor: str | None = None,
    limit: int = 20,
    user_id: int | None = None,
) -> ProblemCursorResponse:
    """Get problems with cursor-based pagination and filters."""
    order_col, descending = parse_sort_params(sort_by)
    cache_key = _build_problems_cache_key(
        search=search,
        difficulty=difficulty,
        topics=topics,
        sort_by=sort_by,
        cursor=cursor,
        limit=limit,
        user_id=user_id,
    )

    # Don't use cache for user-specific requests
    use_cache = not cursor and not search and not user_id

    if use_cache:
        cached_response = await get_cached(cache_key)
        if cached_response:
            return ProblemCursorResponse.model_validate(cached_response)

    cursor_data = decode_cursor(cursor)

    query = select(Problem).options(selectinload(Problem.topics))

    # Search filter - case-insensitive title match
    if search:
        query = query.where(Problem.title.ilike(f"%{search}%"))

    if difficulty:
        query = query.where(Problem.difficulty == difficulty)
    if topics:
        query = query.join(ProblemTopic).join(Topic).where(Topic.slug.in_(topics))

    if cursor_data:
        query = _apply_cursor_filter(query, cursor_data, order_col, descending)

    if descending:
        query = query.order_by(
            getattr(Problem, order_col).desc(),
            Problem.id.desc(),
        )
    else:
        query = query.order_by(
            getattr(Problem, order_col).asc(),
            Problem.id.asc(),
        )

    query = query.limit(limit + 1)
    result = await db.execute(query)
    problems = result.scalars().unique().all()

    has_next = len(problems) > limit
    if has_next:
        problems = problems[:limit]

    total_count = await _get_total_count(db, search, difficulty, topics)

    next_cursor = None
    if has_next and problems:
        next_cursor = _build_next_cursor(problems[-1], order_col, sort_by)

    # Query solved status if user_id provided
    solved_problem_ids: set[int] = set()
    if user_id:
        solved_query = (
            select(Submission.problem_id)
            .where(Submission.user_id == user_id)
            .where(Submission.status == "Accepted")
            .distinct()
        )
        result = await db.execute(solved_query)
        solved_problem_ids = {row[0] for row in result.all()}

    # Build response with is_solved status
    items = []
    for p in problems:
        item = ProblemListItem.model_validate(p)
        item.is_solved = p.id in solved_problem_ids
        items.append(item)

    response = ProblemCursorResponse(
        items=items,
        next_cursor=next_cursor,
        has_next=has_next,
        total_count=total_count if not cursor else None,
    )

    # Only cache non-user-specific requests
    if use_cache:
        await set_cached(cache_key, response.model_dump(mode="json"))

    return response


async def get_problems_list(
    db: AsyncSession,
    difficulty: str | None = None,
    topic: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[Problem]:
    """Get problems with offset-based pagination."""
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
    return list(result.scalars().all())


async def get_problem_by_slug(db: AsyncSession, slug: str) -> Problem | None:
    """Get a single problem by slug with all relations."""
    result = await db.execute(
        select(Problem)
        .options(
            selectinload(Problem.topics),
            selectinload(Problem.examples),
            selectinload(Problem.constraints),
            selectinload(Problem.hints),
            selectinload(Problem.code_snippets),
            selectinload(Problem.solution),
        )
        .where(Problem.slug == slug),
    )
    return result.scalar_one_or_none()


async def get_problem_by_id(db: AsyncSession, problem_id: int) -> Problem | None:
    """Get a single problem by ID."""
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    return result.scalar_one_or_none()


async def get_all_topics(db: AsyncSession) -> list[Topic]:
    """Get all topics ordered by name."""
    # Check cache first
    cache_key = generate_cache_key("topics:all", {})
    cached = await get_cached(cache_key)
    if cached:
        return [Topic(**t) for t in cached["items"]]

    result = await db.execute(select(Topic).order_by(Topic.name))
    topics = list(result.scalars().all())

    # Cache the result
    try:
        cache_data = {
            "items": [{"id": t.id, "name": t.name, "slug": t.slug} for t in topics]
        }
        await set_cached(cache_key, cache_data, ttl=3600)  # 1 hour TTL
    except Exception:
        pass

    return topics


async def invalidate_problem_cache(prefix: str = "problems:*") -> None:
    """Invalidate all problem-related cached responses."""
    await invalidate_cache(prefix)


def _apply_cursor_filter(query, cursor_data: dict, order_col: str, descending: bool):
    """Apply cursor-based filter to query."""
    last_id = cursor_data.get("id")
    last_val = cursor_data.get("val")

    if order_col == "created_at" and last_val:
        last_created = datetime.fromisoformat(last_val)
        if descending:
            return query.where(
                (Problem.created_at < last_created)
                | ((Problem.created_at == last_created) & (Problem.id < last_id)),
            )
        return query.where(
            (Problem.created_at > last_created)
            | ((Problem.created_at == last_created) & (Problem.id > last_id)),
        )
    elif order_col == "frontend_id" and last_val:
        last_frontend_id = int(last_val)
        if descending:
            return query.where(
                (Problem.frontend_id < last_frontend_id)
                | ((Problem.frontend_id == last_frontend_id) & (Problem.id < last_id)),
            )
        return query.where(
            (Problem.frontend_id > last_frontend_id)
            | ((Problem.frontend_id == last_frontend_id) & (Problem.id > last_id)),
        )
    elif order_col == "title" and last_val:
        if descending:
            return query.where(
                (Problem.title < last_val)
                | ((Problem.title == last_val) & (Problem.id < last_id)),
            )
        return query.where(
            (Problem.title > last_val)
            | ((Problem.title == last_val) & (Problem.id > last_id)),
        )
    return query


async def _get_total_count(
    db: AsyncSession,
    search: str | None,
    difficulty: str | None,
    topics: list[str] | None,
) -> int:
    """Get total count of problems matching filters."""
    count_query = select(func.count(Problem.id))
    if search:
        count_query = count_query.where(Problem.title.ilike(f"%{search}%"))
    if difficulty:
        count_query = count_query.where(Problem.difficulty == difficulty)
    if topics:
        count_query = (
            count_query.join(ProblemTopic)
            .join(Topic)
            .where(
                Topic.slug.in_(topics),
            )
        )
    result = await db.execute(count_query)
    return result.scalar() or 0


def _build_next_cursor(last_problem: Problem, order_col: str, sort_by: str) -> str:
    """Build cursor for next page."""
    if order_col == "created_at":
        last_value = last_problem.created_at.isoformat()
    elif order_col == "title":
        last_value = last_problem.title
    else:
        last_value = str(getattr(last_problem, order_col))
    return encode_cursor(sort_by, last_problem.id, last_value)
