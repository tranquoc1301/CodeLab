import os

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Problem, Submission, SubmissionHint, User
from app.models.problem import Topic

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="Set RUN_DB_TESTS=1 when the Postgres test database is available",
)


@pytest_asyncio.fixture
async def hint_submission(db_session: AsyncSession, test_user: User) -> Submission:
    topic = Topic(name="Array", slug="array")
    problem = Problem(
        problem_id=101,
        frontend_id=101,
        title="Two Sum Variant",
        slug="two-sum-variant",
        difficulty="Easy",
        description="Return indices.",
        topics=[topic],
    )
    db_session.add(problem)
    await db_session.flush()

    submission = Submission(
        user_id=test_user.id,
        problem_id=problem.id,
        source_code="for i in range(len(nums)):\n    print(nums[i + 1])",
        language="python3",
        status="Wrong Answer",
        stdout="3",
        stderr="",
        error_type="Wrong Answer",
    )
    db_session.add(submission)
    await db_session.commit()
    await db_session.refresh(submission)
    return submission


@pytest.mark.asyncio
async def test_hint_endpoint_returns_structured_payload(client, auth_headers, hint_submission, monkeypatch):
    async def fake_request_next_hint(**kwargs):
        return {
            "error_code": "algorithm_design_error",
            "level": 1,
            "items": [
                "Bạn đang lấy nhầm trạng thái.",
                "Output lệch khỏi expected output.",
                "Bạn đang dùng dữ liệu của bước nào?",
            ],
        }

    monkeypatch.setattr("app.api.v1.endpoints.submissions.request_next_hint", fake_request_next_hint)
    response = await client.post(
        f"/api/v1/submissions/{hint_submission.id}/hint",
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["error_code"] == "algorithm_design_error"
    assert body["level"] == 1
    assert len(body["items"]) == 3


@pytest.mark.asyncio
async def test_hint_endpoint_blocks_accepted_submission(client, auth_headers, db_session, test_user):
    submission = Submission(
        user_id=test_user.id,
        problem_id=None,
        source_code="print('ok')",
        language="python3",
        status="Accepted",
    )
    db_session.add(submission)
    await db_session.commit()
    await db_session.refresh(submission)

    response = await client.post(
        f"/api/v1/submissions/{submission.id}/hint",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert "No hints needed" in response.json()["detail"]


@pytest.mark.asyncio
async def test_hint_endpoint_blocks_unsupported_classification(
    client,
    auth_headers,
    db_session,
    test_user,
):
    topic = Topic(name="Syntax", slug="syntax")
    problem = Problem(
        problem_id=202,
        frontend_id=202,
        title="Compile Failure",
        slug="compile-failure",
        difficulty="Easy",
        description="Broken code.",
        topics=[topic],
    )
    db_session.add(problem)
    await db_session.flush()

    submission = Submission(
        user_id=test_user.id,
        problem_id=problem.id,
        source_code="print(",
        language="python3",
        status="Compile Error",
        stderr="SyntaxError: invalid syntax",
        error_type="Compile Error",
    )
    db_session.add(submission)
    await db_session.commit()
    await db_session.refresh(submission)

    response = await client.post(
        f"/api/v1/submissions/{submission.id}/hint",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert "không áp dụng cho lỗi biên dịch" in response.json()["detail"]


@pytest.mark.asyncio
async def test_submission_hint_cache_payload_round_trip(db_session, test_user, hint_submission):
    hint = SubmissionHint(
        user_id=test_user.id,
        submission_id=hint_submission.id,
        current_level=1,
        hint_1="1. Quan sát lỗi: ...",
        payload_1={
            "error_code": "algorithm_design_error",
            "level": 1,
            "items": ["...", "...", "..."],
        },
        last_error_label="algorithm_design_error",
    )
    db_session.add(hint)
    await db_session.commit()

    stored = await db_session.get(SubmissionHint, hint.id)
    assert stored.payload_1["level"] == 1
