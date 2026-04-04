"""Submission service for business logic operations."""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.problem import Problem
from app.models.submission import Submission, SubmissionTestResult
from app.models.user import User
from app.schemas.submission import SubmissionCreate, SubmissionResponse, VerdictResponse
from app.services.evaluation import evaluate_submission

logger = logging.getLogger(__name__)


async def create_submission(
    db: AsyncSession,
    user: User,
    submission_data: SubmissionCreate,
) -> SubmissionResponse:
    """Create a new submission and evaluate it if problem_id is provided."""
    # Validate problem exists if provided
    if submission_data.problem_id is not None:
        problem = await _get_problem(db, submission_data.problem_id)
        if problem is None:
            raise ValueError(f"Problem with ID {submission_data.problem_id} not found")

    sample_only = submission_data.submission_type == "run"

    # Create submission record
    new_submission = Submission(
        user_id=user.id,
        problem_id=submission_data.problem_id,
        source_code=submission_data.source_code,
        language=submission_data.language,
        status="Pending",
        submission_type=submission_data.submission_type or "submit",
    )

    db.add(new_submission)
    await db.commit()
    await db.refresh(new_submission)

    # Evaluate if problem is provided
    if submission_data.problem_id is not None:
        try:
            verdict = await evaluate_submission(
                db=db,
                problem_id=submission_data.problem_id,
                source_code=submission_data.source_code,
                language=submission_data.language,
                sample_only=sample_only,
            )

            # Update submission with verdict
            new_submission.status = verdict["status"]
            new_submission.stdout = _truncate(verdict.get("stdout"), 1000)
            new_submission.stderr = _truncate(verdict.get("stderr"), 1000)
            new_submission.error_type = _truncate(verdict.get("error_message"), 50)
            new_submission.execution_time_ms = verdict.get("runtime_ms")
            new_submission.memory_used_kb = verdict.get("memory_kb")
            new_submission.passed_count = verdict.get("passed_test_cases")
            new_submission.total_count = verdict.get("total_test_cases")

            # Persist per-test-case results
            await _persist_test_results(
                db=db,
                submission_id=new_submission.id,
                test_case_results=verdict.get("test_case_results", []),
            )

            await db.commit()
            await db.refresh(new_submission)

        except Exception as e:
            logger.exception(
                f"Evaluation failed for submission {new_submission.id}: {e}"
            )
            new_submission.status = "Internal Error"
            new_submission.error_type = "Evaluation failed"
            await db.commit()

    return await _build_submission_response(db, new_submission)


async def evaluate_code(
    db: AsyncSession,
    user: User,
    submission_data: SubmissionCreate,
) -> VerdictResponse:
    """Evaluate code against test cases and persist submission."""
    if submission_data.problem_id is None:
        raise ValueError("problem_id is required for evaluation")

    problem = await _get_problem(db, submission_data.problem_id)
    if problem is None:
        raise ValueError(f"Problem with ID {submission_data.problem_id} not found")

    sample_only = submission_data.submission_type == "run"

    verdict = await evaluate_submission(
        db=db,
        problem_id=submission_data.problem_id,
        source_code=submission_data.source_code,
        language=submission_data.language,
        return_test_case_data=True,
        sample_only=sample_only,
    )

    # Save the submission for history with pass/total counts
    new_submission = Submission(
        user_id=user.id,
        problem_id=submission_data.problem_id,
        source_code=submission_data.source_code,
        language=submission_data.language,
        status=verdict["status"],
        stdout=_truncate(verdict.get("stdout"), 1000),
        stderr=_truncate(verdict.get("stderr"), 1000),
        error_type=_truncate(verdict.get("error_message"), 50),
        execution_time_ms=verdict.get("runtime_ms"),
        memory_used_kb=verdict.get("memory_kb"),
        submission_type="run" if sample_only else "submit",
        passed_count=verdict.get("passed_test_cases"),
        total_count=verdict.get("total_test_cases"),
    )

    db.add(new_submission)
    await db.commit()
    await db.refresh(new_submission)

    # Persist per-test-case results
    await _persist_test_results(
        db=db,
        submission_id=new_submission.id,
        test_case_results=verdict.get("test_case_results", []),
    )
    await db.commit()

    return VerdictResponse(**verdict)


async def get_user_submissions(
    db: AsyncSession,
    user: User,
    limit: int = 20,
    offset: int = 0,
) -> list[SubmissionResponse]:
    """Get submissions for a user with pagination."""
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.problem))
        .where(Submission.user_id == user.id)
        .order_by(Submission.created_at.desc())
        .offset(offset)
        .limit(limit),
    )
    submissions = result.scalars().all()

    return [_build_submission_response_from_loaded(s) for s in submissions]


async def get_submission_by_id(
    db: AsyncSession,
    user: User,
    submission_id: int,
) -> SubmissionResponse | None:
    """Get a specific submission by ID for a user."""
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.problem))
        .where(
            Submission.id == submission_id,
            Submission.user_id == user.id,
        ),
    )
    submission = result.scalar_one_or_none()

    if submission is None:
        return None

    return _build_submission_response_from_loaded(submission)


async def _get_problem(db: AsyncSession, problem_id: int) -> Problem | None:
    """Get a problem by ID."""
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    return result.scalar_one_or_none()


async def _build_submission_response(
    db: AsyncSession,
    submission: Submission,
) -> SubmissionResponse:
    """Build submission response with problem slug."""
    problem_slug = None
    if submission.problem_id:
        result = await db.execute(
            select(Problem.slug).where(Problem.id == submission.problem_id),
        )
        problem_slug = result.scalar_one_or_none()

    return SubmissionResponse(
        id=submission.id,
        user_id=submission.user_id,
        problem_id=submission.problem_id,
        problem_slug=problem_slug,
        source_code=submission.source_code,
        language=submission.language,
        status=submission.status,
        stdout=submission.stdout,
        stderr=submission.stderr,
        error_type=submission.error_type,
        execution_time_ms=submission.execution_time_ms,
        memory_used_kb=submission.memory_used_kb,
        judge0_token=submission.judge0_token,
        passed_count=submission.passed_count,
        total_count=submission.total_count,
        created_at=submission.created_at,
    )


def _build_submission_response_from_loaded(
    submission: Submission,
) -> SubmissionResponse:
    """Build submission response from already-loaded submission with problem."""
    problem_slug = submission.problem.slug if submission.problem else None

    return SubmissionResponse(
        id=submission.id,
        user_id=submission.user_id,
        problem_id=submission.problem_id,
        problem_slug=problem_slug,
        source_code=submission.source_code,
        language=submission.language,
        status=submission.status,
        stdout=submission.stdout,
        stderr=submission.stderr,
        error_type=submission.error_type,
        execution_time_ms=submission.execution_time_ms,
        memory_used_kb=submission.memory_used_kb,
        judge0_token=submission.judge0_token,
        passed_count=submission.passed_count,
        total_count=submission.total_count,
        created_at=submission.created_at,
    )


def _truncate(value: str | None, max_len: int) -> str | None:
    """Truncate a string to max_len characters."""
    if value is None:
        return None
    return value[:max_len] if len(value) > max_len else value


async def _persist_test_results(
    db: AsyncSession,
    submission_id: int,
    test_case_results: list[dict],
) -> None:
    """Persist per-test-case results to the submission_test_results table."""
    for tc_result in test_case_results:
        record = SubmissionTestResult(
            submission_id=submission_id,
            test_case_id=None,
            status=tc_result.get("status", "Unknown"),
            stdout=_truncate(tc_result.get("stdout"), 2000),
            execution_time_ms=tc_result.get("time_ms"),
            memory_used_kb=tc_result.get("memory_kb"),
        )
        db.add(record)
