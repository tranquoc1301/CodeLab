from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.submission import Submission
from app.models.user import User
from app.schemas.submission import SubmissionCreate, SubmissionResponse
from app.api.routes.auth import get_current_user
from app.services.judge0 import submit_to_judge0

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.post("/", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    submission_data: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await submit_to_judge0(
        source_code=submission_data.source_code,
        language=submission_data.language,
        stdin=submission_data.stdin,
    )

    submission = Submission(
        user_id=current_user.id,
        problem_id=submission_data.problem_id,
        source_code=submission_data.source_code,
        language=submission_data.language,
        status=result.get("status"),
        stdout=result.get("stdout"),
        stderr=result.get("stderr") or result.get("compile_output"),
        error_type=result.get("error_type"),
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission


@router.get("/", response_model=list[SubmissionResponse])
async def list_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Submission).where(Submission.user_id == current_user.id).order_by(Submission.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Submission).where(Submission.id == submission_id, Submission.user_id == current_user.id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return submission
