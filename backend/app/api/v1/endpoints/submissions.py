"""Submission API endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.submission import SubmissionCreate, SubmissionResponse, VerdictResponse
from app.services import submissions as submission_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.post(
    "/",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_submission(
    submission_data: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmissionResponse:
    """Create a new code submission and evaluate it."""
    try:
        return await submission_service.create_submission(
            db=db,
            user=current_user,
            submission_data=submission_data,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.exception(f"Failed to create submission: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )


@router.post(
    "/evaluate",
    response_model=VerdictResponse,
    status_code=status.HTTP_200_OK,
)
async def evaluate_submission(
    submission_data: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VerdictResponse:
    """Evaluate code against test cases (saves submission for history)."""
    try:
        return await submission_service.evaluate_code(
            db=db,
            user=current_user,
            submission_data=submission_data,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.exception(f"Evaluation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Evaluation failed due to an internal error",
        )


@router.get("/", response_model=list[SubmissionResponse])
async def list_submissions(
    limit: int = Query(
        default=20, ge=1, le=100, description="Number of submissions to return"
    ),
    offset: int = Query(default=0, ge=0, description="Number of submissions to skip"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SubmissionResponse]:
    """List submissions for the current user with pagination."""
    return await submission_service.get_user_submissions(
        db=db,
        user=current_user,
        limit=limit,
        offset=offset,
    )


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmissionResponse:
    """Get a specific submission by ID."""
    submission = await submission_service.get_submission_by_id(
        db=db,
        user=current_user,
        submission_id=submission_id,
    )
    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )
    return submission
