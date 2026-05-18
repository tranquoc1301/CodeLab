import os
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Submission, SubmissionErrorEvent, User

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="Set RUN_DB_TESTS=1 when the Postgres test database is available",
)


@pytest.mark.asyncio
async def test_error_profile_endpoint_returns_empty_state(
    client,
    auth_headers,
):
    response = await client.get("/api/v1/profile/error-profile", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["totals"]["recent_profiled_submissions"] == 0
    assert body["totals"]["lifetime_profiled_submissions"] == 0
    assert body["chart"]["labels"] == []
    assert body["top_labels"] == []


@pytest.mark.asyncio
async def test_error_profile_endpoint_returns_profile_payload(
    client,
    auth_headers,
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
                now - timedelta(days=2),
                now - timedelta(days=8),
                now - timedelta(days=35),
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
                error_label="algorithm_design_error",
                diagnosis_detail="wrong_answer_state_index",
                problem_difficulty="Medium",
                topic_slugs=["array", "two-pointers"],
                submission_created_at=now - timedelta(days=2),
            ),
            SubmissionErrorEvent(
                submission_id=submissions[1].id,
                user_id=test_user.id,
                problem_id=None,
                error_label="algorithm_design_error",
                diagnosis_detail="wrong_answer_state_index",
                problem_difficulty="Medium",
                topic_slugs=["array"],
                submission_created_at=now - timedelta(days=8),
            ),
            SubmissionErrorEvent(
                submission_id=submissions[2].id,
                user_id=test_user.id,
                problem_id=None,
                error_label="memory_reference_error",
                diagnosis_detail="runtime_reference_type",
                problem_difficulty="Easy",
                topic_slugs=["linked-list"],
                submission_created_at=now - timedelta(days=35),
            ),
        ]
    )
    await db_session.commit()

    response = await client.get("/api/v1/profile/error-profile", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["recent_window_days"] == 30
    assert body["totals"]["recent_profiled_submissions"] == 2
    assert body["totals"]["lifetime_profiled_submissions"] == 3
    assert body["chart"]["labels"][0]["code"] == "algorithm_design_error"
    assert body["top_labels"][0]["top_detail"]["code"] == "wrong_answer_state_index"
    assert body["top_labels"][0]["top_topics"][0]["slug"] == "array"
