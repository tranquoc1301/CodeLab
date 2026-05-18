import os
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Problem, Submission, SubmissionErrorEvent, User
from app.models.problem import Topic
from app.services.error_profile import get_error_profile, record_submission_error_event

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="Set RUN_DB_TESTS=1 when the Postgres test database is available",
)


@pytest_asyncio.fixture
async def profile_problem(db_session: AsyncSession) -> Problem:
    topic_a = Topic(name="Array", slug="array")
    topic_b = Topic(name="Binary Search", slug="binary-search")
    problem = Problem(
        problem_id=301,
        frontend_id=301,
        title="Profile Problem",
        slug="profile-problem",
        difficulty="Medium",
        description="Check profile aggregation.",
        topics=[topic_a, topic_b],
    )
    db_session.add(problem)
    await db_session.commit()
    await db_session.refresh(problem)
    return problem


@pytest.mark.asyncio
async def test_record_submission_error_event_persists_supported_submit(
    db_session: AsyncSession,
    test_user: User,
    profile_problem: Problem,
):
    submission = Submission(
        user_id=test_user.id,
        problem_id=profile_problem.id,
        source_code="for i in range(len(nums)):\n    total += nums[i]",
        language="python3",
        status="Wrong Answer",
        submission_type="submit",
        error_type="Wrong Answer",
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(submission)
    await db_session.commit()
    await db_session.refresh(submission)

    event = await record_submission_error_event(
        db_session,
        submission,
        verdict={
            "status": "Wrong Answer",
            "stdout": "3",
            "expected_output": "4",
            "stdin": "1 2 3",
            "error_message": "Wrong Answer",
        },
        topic_slugs=["array", "binary-search"],
        problem_difficulty=profile_problem.difficulty,
    )
    await db_session.commit()

    assert event is not None
    assert event.error_label == "algorithm_design_error"
    assert event.diagnosis_detail == "wrong_answer_state_index"
    assert event.topic_slugs == ["array", "binary-search"]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("status", "submission_type", "verdict", "topic_slugs"),
    [
        ("Accepted", "submit", {"status": "Accepted"}, ["array"]),
        ("Wrong Answer", "run", {"status": "Wrong Answer"}, ["array"]),
        (
            "Compile Error",
            "submit",
            {"status": "Compile Error", "stderr": "SyntaxError: invalid syntax"},
            [],
        ),
    ],
)
async def test_record_submission_error_event_skips_unsupported_cases(
    db_session: AsyncSession,
    test_user: User,
    profile_problem: Problem,
    status: str,
    submission_type: str,
    verdict: dict,
    topic_slugs: list[str],
):
    submission = Submission(
        user_id=test_user.id,
        problem_id=profile_problem.id,
        source_code="print(" if status == "Compile Error" else "return 0",
        language="python3",
        status=status,
        submission_type=submission_type,
        error_type=status,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(submission)
    await db_session.commit()
    await db_session.refresh(submission)

    event = await record_submission_error_event(
        db_session,
        submission,
        verdict=verdict,
        topic_slugs=topic_slugs,
        problem_difficulty=profile_problem.difficulty,
    )

    assert event is None


@pytest.mark.asyncio
async def test_get_error_profile_aggregates_recent_lifetime_and_chart(
    db_session: AsyncSession,
    test_user: User,
):
    now = datetime.now(timezone.utc)
    submissions = [
        Submission(
            user_id=test_user.id,
            problem_id=None,
            source_code=f"print({index})",
            language="python3",
            status="Wrong Answer",
            submission_type="submit",
            created_at=created_at,
        )
        for index, created_at in enumerate(
            [
                now - timedelta(days=5),
                now - timedelta(days=10),
                now - timedelta(days=12),
                now - timedelta(days=40),
            ],
            start=1,
        )
    ]
    db_session.add_all(submissions)
    await db_session.flush()
    db_session.add_all(
        [
            SubmissionErrorEvent(
                submission_id=submissions[0].id,
                user_id=test_user.id,
                problem_id=None,
                error_label="boundary_condition_error",
                diagnosis_detail="wrong_answer_boundary",
                problem_difficulty="Easy",
                topic_slugs=["array", "binary-search"],
                submission_created_at=now - timedelta(days=5),
            ),
            SubmissionErrorEvent(
                submission_id=submissions[1].id,
                user_id=test_user.id,
                problem_id=None,
                error_label="boundary_condition_error",
                diagnosis_detail="wrong_answer_boundary",
                problem_difficulty="Easy",
                topic_slugs=["array"],
                submission_created_at=now - timedelta(days=10),
            ),
            SubmissionErrorEvent(
                submission_id=submissions[2].id,
                user_id=test_user.id,
                problem_id=None,
                error_label="complexity_error",
                diagnosis_detail="tle_complexity",
                problem_difficulty="Hard",
                topic_slugs=["graph"],
                submission_created_at=now - timedelta(days=12),
            ),
            SubmissionErrorEvent(
                submission_id=submissions[3].id,
                user_id=test_user.id,
                problem_id=None,
                error_label="boundary_condition_error",
                diagnosis_detail="wrong_answer_boundary",
                problem_difficulty="Easy",
                topic_slugs=["array"],
                submission_created_at=now - timedelta(days=40),
            ),
        ]
    )
    await db_session.commit()

    profile = await get_error_profile(db_session, test_user.id)

    assert profile.recent_window_days == 30
    assert profile.totals.recent_profiled_submissions == 3
    assert profile.totals.lifetime_profiled_submissions == 4
    assert profile.chart.labels[0].code == "boundary_condition_error"
    assert profile.chart.labels[0].recent_count == 2
    assert profile.chart.labels[0].lifetime_count == 3
    assert profile.top_labels[0].trend_delta == 1
    assert profile.top_labels[0].top_topics[0].slug == "array"
    assert "array" in profile.top_labels[0].practice_focus
