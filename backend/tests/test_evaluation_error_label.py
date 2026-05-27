import pytest

from app.services.evaluation import evaluate_submission


@pytest.mark.asyncio
async def test_evaluate_submission_returns_error_label_for_failed_verdict(monkeypatch):
    async def fake_get_problem_test_cases(db, problem_id, sample_only=False):
        del db, problem_id, sample_only
        return [{"stdin": "1 2 3", "expected_output": "4"}]

    async def fake_get_problem_driver(db, problem_id, language):
        del db, problem_id, language
        return {"prefix_code": "", "driver_code": ""}

    async def fake_submit_to_judge0(source_code, language, stdin, expected_output):
        del source_code, language, stdin, expected_output
        return {
            "status": "Accepted",
            "stdout": "3",
            "stderr": "",
            "compile_output": "",
            "error_type": None,
            "time": 0.01,
            "memory": 1024,
        }

    async def fake_get_problem_topic_slugs(db, problem_id):
        del db, problem_id
        return ["array", "two-pointers"]

    monkeypatch.setattr(
        "app.services.evaluation.get_problem_test_cases",
        fake_get_problem_test_cases,
    )
    monkeypatch.setattr(
        "app.services.evaluation.get_problem_driver",
        fake_get_problem_driver,
    )
    monkeypatch.setattr(
        "app.services.evaluation.submit_to_judge0",
        fake_submit_to_judge0,
    )
    monkeypatch.setattr(
        "app.services.evaluation._get_problem_topic_slugs",
        fake_get_problem_topic_slugs,
    )

    verdict = await evaluate_submission(
        db=None,
        problem_id=1,
        source_code="for i in range(len(nums)):\n    total += nums[i]",
        language="python3",
        return_test_case_data=True,
        sample_only=False,
    )

    assert verdict["status"] == "Wrong Answer"
    assert verdict["error_label"] == "algorithm_design_error"
