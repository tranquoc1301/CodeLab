"""Admin endpoints for managing problems, topics, users, and submissions.

All endpoints require an authenticated user with `is_admin=True`.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_admin_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.admin import (
    AdminExtendedStats,
    AdminPaginatedResponse,
    AdminProblemCreate,
    AdminProblemDetail,
    AdminProblemListItem,
    AdminProblemUpdate,
    AdminStats,
    AdminSubmissionItem,
    AdminTopicCreate,
    AdminTopicItem,
    AdminTopicUpdate,
    AdminUserItem,
    AdminUserUpdate,
)
from app.services import admin as admin_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin_user)],
)


# --- Problems ---


@router.get("/problems", response_model=AdminPaginatedResponse[AdminProblemListItem])
async def list_problems(
    search: Optional[str] = Query(None, description="Filter by title (case-insensitive)"),
    difficulty: Optional[str] = Query(None, pattern="^(Easy|Medium|Hard)$"),
    topic: Optional[str] = Query(None, description="Filter by topic slug"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> AdminPaginatedResponse[AdminProblemListItem]:
    items, total = await admin_service.list_problems_admin(
        db=db,
        search=search,
        difficulty=difficulty,
        topic_slug=topic,
        page=page,
        page_size=page_size,
    )
    has_next = (page * page_size) < total
    return AdminPaginatedResponse[AdminProblemListItem](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=has_next,
    )


@router.post(
    "/problems",
    response_model=AdminProblemDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_problem(
    payload: AdminProblemCreate,
    db: AsyncSession = Depends(get_db),
) -> AdminProblemDetail:
    try:
        return await admin_service.create_problem_admin(db=db, data=payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/problems/{problem_id}", response_model=AdminProblemDetail)
async def get_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
) -> AdminProblemDetail:
    problem = await admin_service.get_problem_admin(db=db, problem_id=problem_id)
    if problem is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found"
        )
    return problem


@router.patch("/problems/{problem_id}", response_model=AdminProblemDetail)
async def update_problem(
    problem_id: int,
    payload: AdminProblemUpdate,
    db: AsyncSession = Depends(get_db),
) -> AdminProblemDetail:
    try:
        problem = await admin_service.update_problem_admin(
            db=db, problem_id=problem_id, data=payload
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if problem is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found"
        )
    return problem


@router.delete("/problems/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    deleted = await admin_service.delete_problem_admin(db=db, problem_id=problem_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found"
        )


# --- Topics ---


@router.get("/topics", response_model=list[AdminTopicItem])
async def list_topics(
    search: Optional[str] = Query(None, description="Filter by name or slug"),
    db: AsyncSession = Depends(get_db),
) -> list[AdminTopicItem]:
    return await admin_service.list_topics_admin(db=db, search=search)


@router.post(
    "/topics",
    response_model=AdminTopicItem,
    status_code=status.HTTP_201_CREATED,
)
async def create_topic(
    payload: AdminTopicCreate,
    db: AsyncSession = Depends(get_db),
) -> AdminTopicItem:
    try:
        return await admin_service.create_topic_admin(db=db, data=payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.patch("/topics/{topic_id}", response_model=AdminTopicItem)
async def update_topic(
    topic_id: int,
    payload: AdminTopicUpdate,
    db: AsyncSession = Depends(get_db),
) -> AdminTopicItem:
    try:
        topic = await admin_service.update_topic_admin(
            db=db, topic_id=topic_id, data=payload
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if topic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found"
        )
    return topic


@router.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    topic_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    deleted = await admin_service.delete_topic_admin(db=db, topic_id=topic_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found"
        )


# --- Users (read-only) ---


@router.get("/users", response_model=list[AdminUserItem])
async def list_users(
    search: Optional[str] = Query(None, description="Filter by username or email"),
    is_active: Optional[bool] = Query(None, description="Filter by active flag"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
) -> list[AdminUserItem]:
    return await admin_service.list_users_admin(
        db=db, search=search, is_active=is_active
    )


@router.patch("/users/{user_id}", response_model=AdminUserItem)
async def update_user(
    user_id: int,
    data: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> AdminUserItem:
    try:
        return await admin_service.update_user_admin(
            db=db, user_id=user_id, data=data, admin_user_id=admin.id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


# --- Submissions (read-only) ---


@router.get(
    "/submissions",
    response_model=AdminPaginatedResponse[AdminSubmissionItem],
)
async def list_submissions(
    status_filter: Optional[str] = Query(
        None, alias="status", description="Filter by submission status"
    ),
    problem_id: Optional[int] = Query(None, gt=0),
    user_id: Optional[int] = Query(None, gt=0),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> AdminPaginatedResponse[AdminSubmissionItem]:
    items, total = await admin_service.list_submissions_admin(
        db=db,
        status=status_filter,
        problem_id=problem_id,
        user_id=user_id,
        limit=page_size,
        offset=(page - 1) * page_size,
    )
    has_next = (page * page_size) < total
    return AdminPaginatedResponse[AdminSubmissionItem](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=has_next,
    )


# --- Stats ---


@router.get("/stats", response_model=AdminStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
) -> AdminStats:
    return await admin_service.get_admin_stats(db=db)


@router.get("/stats/extended", response_model=AdminExtendedStats)
async def get_extended_stats(
    db: AsyncSession = Depends(get_db),
) -> AdminExtendedStats:
    return await admin_service.get_extended_admin_stats(db=db)
