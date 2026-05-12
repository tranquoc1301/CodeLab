import pytest

from app.services.error_classifier import classify_verdict
from app.services.hint_diagnostics import diagnose_submission


@pytest.mark.parametrize(
    ("verdict", "expected"),
    [
        ({"status": "Compile Error", "stderr": "SyntaxError: invalid syntax"}, None),
        ({"status": "Time Limit Exceeded"}, "complexity_error"),
        (
            {
                "status": "Runtime Error",
                "stderr": "RecursionError: maximum recursion depth exceeded",
                "error_message": "RecursionError",
            },
            "recursion_error",
        ),
        (
            {
                "status": "Runtime Error",
                "stderr": "IndexError: list index out of range",
                "error_message": "IndexError",
            },
            "memory_reference_error",
        ),
    ],
)
def test_classify_verdict_runtime_families(verdict, expected):
    assert classify_verdict(verdict) == expected


def test_classify_verdict_returns_none_for_accepted():
    assert classify_verdict({"status": "Accepted"}) is None


def test_diagnose_submission_detects_format_issue_from_whitespace_only_diff():
    snapshot = diagnose_submission(
        {
            "status": "Wrong Answer",
            "stdout": "[1, 2]",
            "expected_output": "[1,2]",
            "stdin": "nums = [1,2]",
        },
        topic_slugs=["array"],
        source_code="print(ans)",
    )

    assert snapshot.diagnosis_label == "boundary_condition_error"
    assert snapshot.diagnosis_detail == "wrong_answer_parsing_format"
    assert "định dạng" in snapshot.learner_summary.lower()


def test_diagnose_submission_marks_compile_errors_as_unsupported():
    snapshot = diagnose_submission(
        {
            "status": "Compile Error",
            "stderr": "SyntaxError: invalid syntax",
        },
        topic_slugs=[],
        source_code="print(",
    )

    assert snapshot.diagnosis_label == "unknown"
    assert snapshot.diagnosis_detail == "compile_syntax"


def test_diagnose_submission_prefers_state_index_for_array_logic():
    snapshot = diagnose_submission(
        {
            "status": "Wrong Answer",
            "stdout": "3",
            "expected_output": "4",
            "stdin": "1 2 3",
        },
        topic_slugs=["array", "two-pointers"],
        source_code="for i in range(len(nums)):\n    total += nums[i]",
    )

    assert snapshot.diagnosis_label == "algorithm_design_error"
    assert snapshot.diagnosis_detail == "wrong_answer_state_index"
    assert "chỉ số" in snapshot.diagnosis_detail_display.lower() or "trạng thái" in snapshot.diagnosis_detail_display.lower()


def test_diagnose_submission_falls_back_to_boundary_for_generic_wrong_answer():
    snapshot = diagnose_submission(
        {
            "status": "Wrong Answer",
            "stdout": "0",
            "expected_output": "1",
            "stdin": "",
        },
        topic_slugs=["math"],
        source_code="return 0",
    )

    assert snapshot.diagnosis_label in {"logic_calculation_error", "boundary_condition_error", "algorithm_design_error"}
