"""Submission API routes with validation and error handling."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from pydantic import Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError, DataError

from app.database import get_db
from app.models.submission import Submission
from app.models.problem import Problem
from app.models.user import User
from app.schemas.submission import SubmissionCreate, SubmissionResponse
from app.api.routes.auth import get_current_user
from app.services.judge0 import submit_to_judge0

router = APIRouter(prefix="/submissions", tags=["submissions"])
logger = logging.getLogger(__name__)


@router.post(
    "/",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"description": "Invalid input - validation error"},
        401: {"description": "Unauthorized"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"},
    },
)
async def create_submission(
    request: Request,
    submission_data: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new code submission.
    
    - **source_code**: Required. The source code to execute (1-50000 characters)
    - **language**: Required. One of: python, java, cpp, c
    - **stdin**: Optional. Standard input for the code
    - **problem_id**: Optional. The problem ID this submission is for
    
    Returns the submission with execution results.
    """
    logger.info(
        f"Submission request: user={current_user.id}, "
        f"language={submission_data.language}, "
        f"code_length={len(submission_data.source_code)}, "
        f"problem_id={submission_data.problem_id}"
    )
    
    try:
        # Validate problem exists if problem_id is provided
        if submission_data.problem_id is not None:
            result = await db.execute(
                select(Problem).where(Problem.id == submission_data.problem_id)
            )
            problem = result.scalar_one_or_none()
            if problem is None:
                logger.warning(f"Submission with non-existent problem_id: {submission_data.problem_id}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Problem with ID {submission_data.problem_id} not found",
                )
        
        # Submit to Judge0
        logger.info(f"Submitting to Judge0: language={submission_data.language}")
        judge0_result = await submit_to_judge0(
            source_code=submission_data.source_code,
            language=submission_data.language,
            stdin=submission_data.stdin,
        )
        
        # Check if Judge0 returned an error
        if "error" in judge0_result and judge0_result.get("error_type"):
            logger.warning(f"Judge0 error: {judge0_result['error_type']}")
        
        # Create submission record
        submission = Submission(
            user_id=current_user.id,
            problem_id=submission_data.problem_id,
            source_code=submission_data.source_code,
            language=submission_data.language,
            status=judge0_result.get("status"),
            stdout=judge0_result.get("stdout"),
            stderr=judge0_result.get("stderr") or judge0_result.get("compile_output"),
            error_type=judge0_result.get("error_type"),
        )
        
        db.add(submission)
        
        # Commit transaction
        await db.commit()
        await db.refresh(submission)
        
        logger.info(f"Submission created successfully: id={submission.id}, status={submission.status}")
        
        # Build response with problem slug
        response_data = {
            "id": submission.id,
            "user_id": submission.user_id,
            "problem_id": submission.problem_id,
            "problem_slug": None,
            "source_code": submission.source_code,
            "language": submission.language,
            "status": submission.status,
            "stdout": submission.stdout,
            "stderr": submission.stderr,
            "error_type": submission.error_type,
            "execution_time_ms": submission.execution_time_ms,
            "memory_used_kb": submission.memory_used_kb,
            "judge0_token": submission.judge0_token,
            "created_at": submission.created_at,
        }
        
        # Get problem slug if problem_id was provided
        if submission.problem_id:
            try:
                result = await db.execute(
                    select(Problem.slug).where(Problem.id == submission.problem_id)
                )
                problem_slug = result.scalar_one_or_none()
                if problem_slug:
                    response_data["problem_slug"] = problem_slug
            except Exception as e:
                logger.warning(f"Failed to fetch problem slug: {e}")
        
        return response_data
        
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        logger.exception(f"Database integrity error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database constraint violation",
        )
    except DataError as e:
        await db.rollback()
        logger.exception(f"Database data error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid data format",
        )
    except Exception as e:
        await db.rollback()
        logger.exception(f"Unexpected error creating submission: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )


@router.get("/", response_model=list[SubmissionResponse])
async def list_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all submissions for the current user."""
    logger.info(f"Listing submissions for user: {current_user.id}")
    
    try:
        result = await db.execute(
            select(Submission)
            .where(Submission.user_id == current_user.id)
            .order_by(Submission.created_at.desc())
        )
        submissions = result.scalars().all()
        
        response = []
        for sub in submissions:
            sub_dict = {
                "id": sub.id,
                "user_id": sub.user_id,
                "problem_id": sub.problem_id,
                "problem_slug": None,
                "source_code": sub.source_code,
                "language": sub.language,
                "status": sub.status,
                "stdout": sub.stdout,
                "stderr": sub.stderr,
                "error_type": sub.error_type,
                "execution_time_ms": sub.execution_time_ms,
                "memory_used_kb": sub.memory_used_kb,
                "judge0_token": sub.judge0_token,
                "created_at": sub.created_at,
            }
            if sub.problem_id:
                problem_result = await db.execute(
                    select(Problem).where(Problem.id == sub.problem_id)
                )
                problem = problem_result.scalar_one_or_none()
                if problem:
                    sub_dict["problem_slug"] = problem.slug
            response.append(sub_dict)
        
        logger.info(f"Found {len(response)} submissions for user {current_user.id}")
        return response
        
    except Exception as e:
        logger.exception(f"Error listing submissions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch submissions",
        )


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific submission by ID."""
    logger.info(f"Fetching submission {submission_id} for user {current_user.id}")
    
    try:
        result = await db.execute(
            select(Submission).where(
                Submission.id == submission_id,
                Submission.user_id == current_user.id
            )
        )
        submission = result.scalar_one_or_none()
        
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found",
            )
        
        sub_dict = {
            "id": submission.id,
            "user_id": submission.user_id,
            "problem_id": submission.problem_id,
            "problem_slug": None,
            "source_code": submission.source_code,
            "language": submission.language,
            "status": submission.status,
            "stdout": submission.stdout,
            "stderr": submission.stderr,
            "error_type": submission.error_type,
            "execution_time_ms": submission.execution_time_ms,
            "memory_used_kb": submission.memory_used_kb,
            "judge0_token": submission.judge0_token,
            "created_at": submission.created_at,
        }
        if submission.problem_id:
            problem_result = await db.execute(
                select(Problem).where(Problem.id == submission.problem_id)
            )
            problem = problem_result.scalar_one_or_none()
            if problem:
                sub_dict["problem_slug"] = problem.slug
        
        return sub_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching submission {submission_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch submission",
        )