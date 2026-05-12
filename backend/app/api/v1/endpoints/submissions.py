import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.problem import Problem
from app.models.user import User
from app.schemas.hint import HintResponse
from app.schemas.submission import SubmissionCreate, SubmissionResponse, VerdictResponse
from app.services import submissions as submission_service
from app.services.llm_hint import request_next_hint
from app.services.submissions import get_topic_slugs_for_problem

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
    offset: int = Query(
        default=0, ge=0, description="Number of submissions to skip"
    ),
    problem_id: int | None = Query(
        default=None, description="Filter submissions by problem ID"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SubmissionResponse]:
    """List submissions for the current user with pagination."""
    return await submission_service.get_user_submissions(
        db=db,
        user=current_user,
        limit=limit,
        offset=offset,
        problem_id=problem_id,
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


@router.post("/{submission_id}/hint", response_model=HintResponse)
async def get_hint(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HintResponse:
    """Request a progressive hint for a submission."""
    # 1. Get submission
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
    
    # 2. Check problem exists
    if submission.problem_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No problem associated with this submission",
        )
    
    # 3. Check not already accepted
    if submission.status == "Accepted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hints needed for Accepted submission",
        )
    
    # 4. Build verdict dict
    failing_result = next(
        (
            result
            for result in submission.test_case_results
            if result.status != "Accepted"
        ),
        None,
    )
    verdict = {
        "status": submission.status,
        "stderr": submission.stderr or getattr(failing_result, "stderr", None),
        "stdout": getattr(failing_result, "stdout", None) if failing_result else submission.stdout,
        "error_message": submission.error_type,
        "stdin": getattr(failing_result, "input", None) if failing_result else None,
        "expected_output": getattr(failing_result, "expected_output", None) if failing_result else None,
    }
    
    # 5. Get topic slugs
    topic_slugs = await get_topic_slugs_for_problem(db, submission.problem_id)
    problem_result = await db.execute(select(Problem).where(Problem.id == submission.problem_id))
    problem = problem_result.scalar_one_or_none()
    problem_description = ""
    if problem is not None:
        problem_description = f"{problem.title}\n{problem.description or ''}".strip()
    
    # 6. Request hint
    try:
        result = await request_next_hint(
            db=db,
            user_id=current_user.id,
            submission_id=submission_id,
            verdict=verdict,
            topic_slugs=topic_slugs,
            source_code=submission.source_code or "",
            problem_description=problem_description,
            language=submission.language,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.exception("Failed to generate hint for submission %s: %s", submission_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate hint: {type(e).__name__}: {str(e)[:100]}",
        )
    
    # 7. Return response
    return HintResponse(**result)
