from __future__ import annotations

import re
from dataclasses import dataclass

DIAGNOSIS_LABELS = {
    "logic_calculation_error": "Logic & Calculation Error",
    "complexity_error": "Complexity & TLE Error",
    "memory_reference_error": "Memory & Reference Error",
    "recursion_error": "Recursion Error",
    "algorithm_design_error": "Algorithm Design Error",
    "boundary_condition_error": "Boundary & Edge Case Error",
    "unknown": "Chưa đủ tín hiệu",
}
SUPPORTED_HINT_LABELS = frozenset(
    {
        "logic_calculation_error",
        "complexity_error",
        "memory_reference_error",
        "recursion_error",
        "algorithm_design_error",
        "boundary_condition_error",
    }
)
DIAGNOSIS_DETAIL_LABELS = {
    "compile_syntax": "Lỗi biên dịch",
    "wrong_answer_boundary": "Sai điều kiện biên",
    "wrong_answer_state_index": "Sai chỉ số/trạng thái",
    "wrong_answer_parsing_format": "Sai định dạng đầu ra",
    "runtime_reference_type": "Lỗi truy cập dữ liệu",
    "runtime_recursion": "Lỗi đệ quy",
    "tle_complexity": "Thuật toán quá chậm",
    "logic_calculation": "Sai logic/tính toán",
    "algorithm_design": "Sai thiết kế thuật toán",
    "unknown": "Chưa đủ tín hiệu",
}
ALGORITHM_TOPICS = frozenset(
    {
        "dynamic-programming",
        "dp",
        "graph",
        "tree",
        "binary-tree",
        "binary-search-tree",
        "breadth-first-search",
        "bfs",
        "depth-first-search",
        "dfs",
        "greedy",
        "backtracking",
        "divide-and-conquer",
        "sorting",
        "binary-search",
        "heap",
        "priority-queue",
        "trie",
        "union-find",
        "disjoint-set",
        "segment-tree",
        "topological-sort",
        "shortest-path",
        "minimum-spanning-tree",
        "two-pointers",
        "sliding-window",
        "monotonic-stack",
        "monotonic-queue",
        "linked-list",
        "stack",
        "queue",
        "hash-table",
        "string",
        "array",
    }
)
MATH_TOPICS = frozenset(
    {
        "math",
        "mathematics",
        "bit-manipulation",
        "bitwise",
        "number-theory",
        "combinatorics",
        "geometry",
        "modular-arithmetic",
        "prime",
        "greatest-common-divisor",
        "gcd",
        "least-common-multiple",
        "lcm",
        "probability",
        "statistics",
    }
)

_RECURSION_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"recursion",
        r"maximum recursion depth exceeded",
        r"stack overflow",
        r"stackoverflowerror",
    )
]

_INDEX_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"index",
        r"out of range",
        r"out of bounds",
        r"subscript",
    )
]

_REFERENCE_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"null",
        r"none",
        r"attributeerror",
        r"typeerror",
        r"sigsegv",
        r"segmentation fault",
        r"nil",
    )
]


@dataclass(slots=True)
class DiagnosticSnapshot:
    diagnosis_label: str
    diagnosis_display: str
    diagnosis_detail: str
    diagnosis_detail_display: str
    learner_summary: str
    observed_symptom: str
    focus_area: str
    concept_hint: str
    failure_signal: str


def get_diagnosis_display(label: str) -> str:
    return DIAGNOSIS_LABELS.get(label, DIAGNOSIS_LABELS["unknown"])


def get_diagnosis_detail_display(detail: str) -> str:
    return DIAGNOSIS_DETAIL_LABELS.get(detail, DIAGNOSIS_DETAIL_LABELS["unknown"])


def diagnose_submission(
    verdict: dict,
    topic_slugs: list[str] | None = None,
    source_code: str = "",
) -> DiagnosticSnapshot:
    """Build a normalized diagnostic snapshot for hint generation."""
    topic_slugs = [slug.lower() for slug in (topic_slugs or [])]
    status = (verdict.get("status") or "").strip()
    stderr = (verdict.get("stderr") or "").strip()
    error_message = (verdict.get("error_message") or "").strip()
    actual_output = (verdict.get("stdout") or "").strip()
    expected_output = (verdict.get("expected_output") or "").strip()
    failing_input = (verdict.get("stdin") or "").strip()
    combined_error = " ".join(part for part in (stderr, error_message) if part)
    normalized_code = source_code.lower()
    normalized_status = status.lower()
    failure_signal = _compose_failure_signal(
        failing_input,
        actual_output,
        expected_output,
    )
    output_mismatch = _compose_output_mismatch(actual_output, expected_output)

    if "compil" in normalized_status or _looks_like_compile_error(combined_error):
        return DiagnosticSnapshot(
            diagnosis_label="unknown",
            diagnosis_display=get_diagnosis_display("unknown"),
            diagnosis_detail="compile_syntax",
            diagnosis_detail_display=get_diagnosis_detail_display("compile_syntax"),
            learner_summary="Bài nộp chưa chạy được vì trình biên dịch hoặc thông dịch dừng lại trước khi vào logic chính.",
            observed_symptom=_pick(
                combined_error,
                "Thông báo lỗi xuất hiện ngay ở bước biên dịch hoặc phân tích cú pháp.",
            ),
            focus_area="câu lệnh hoặc biểu thức vừa được thêm gần vị trí báo lỗi",
            concept_hint="cú pháp, kiểu dữ liệu, hoặc chữ ký hàm",
            failure_signal=failure_signal,
        )

    if "time limit" in normalized_status or "timeout" in normalized_status:
        return DiagnosticSnapshot(
            diagnosis_label="complexity_error",
            diagnosis_display=get_diagnosis_display("complexity_error"),
            diagnosis_detail="tle_complexity",
            diagnosis_detail_display=get_diagnosis_detail_display("tle_complexity"),
            learner_summary="Bài nộp đúng hướng xử lý cơ bản nhưng đang tốn quá nhiều bước trên input lớn.",
            observed_symptom="Chương trình không hoàn tất trong thời gian cho phép của judge.",
            focus_area="đoạn lặp lồng nhau hoặc thao tác lặp lại trên cùng dữ liệu",
            concept_hint="độ phức tạp thời gian và số lần quét dữ liệu",
            failure_signal=failure_signal,
        )

    if _looks_like_recursion_error(normalized_status, combined_error):
        return DiagnosticSnapshot(
            diagnosis_label="recursion_error",
            diagnosis_display=get_diagnosis_display("recursion_error"),
            diagnosis_detail="runtime_recursion",
            diagnosis_detail_display=get_diagnosis_detail_display("runtime_recursion"),
            learner_summary="Luồng đệ quy chưa có điều kiện dừng đủ chặt hoặc vẫn quay lại cùng trạng thái.",
            observed_symptom=_pick(
                combined_error,
                "Chương trình dừng với dấu hiệu tràn ngăn xếp hoặc lặp đệ quy quá sâu.",
            ),
            focus_area="điều kiện dừng và tham số truyền vào lần gọi đệ quy kế tiếp",
            concept_hint="đệ quy, trạng thái giảm dần, và base case",
            failure_signal=failure_signal,
        )

    if _looks_like_runtime_reference(normalized_status, combined_error):
        return DiagnosticSnapshot(
            diagnosis_label="memory_reference_error",
            diagnosis_display=get_diagnosis_display("memory_reference_error"),
            diagnosis_detail="runtime_reference_type",
            diagnosis_detail_display=get_diagnosis_detail_display("runtime_reference_type"),
            learner_summary="Có một giá trị, chỉ số, hoặc kiểu dữ liệu bị dùng ở trạng thái không hợp lệ khi chạy.",
            observed_symptom=_pick(
                combined_error,
                "Chương trình dừng giữa chừng khi truy cập dữ liệu hoặc dùng sai kiểu giá trị.",
            ),
            focus_area=_runtime_focus_area(normalized_code, combined_error),
            concept_hint="kiểm tra phạm vi chỉ số, giá trị rỗng, và kiểu dữ liệu tại chỗ dùng",
            failure_signal=failure_signal,
        )

    if "wrong answer" in normalized_status or "format error" in normalized_status:
        if _looks_like_format_issue(actual_output, expected_output):
            return DiagnosticSnapshot(
                diagnosis_label="boundary_condition_error",
                diagnosis_display=get_diagnosis_display("boundary_condition_error"),
                diagnosis_detail="wrong_answer_parsing_format",
                diagnosis_detail_display=get_diagnosis_detail_display("wrong_answer_parsing_format"),
                learner_summary="Kết quả gần đúng về nội dung nhưng khác quy ước định dạng mà bài yêu cầu.",
                observed_symptom=output_mismatch,
                focus_area="bước ghép chuỗi, in kết quả, hoặc chuyển cấu trúc dữ liệu sang output",
                concept_hint="định dạng đầu ra, thứ tự phần tử, và khoảng trắng có ý nghĩa",
                failure_signal=failure_signal,
            )

        if _looks_like_state_or_index_issue(topic_slugs, normalized_code, actual_output, expected_output):
            return DiagnosticSnapshot(
                diagnosis_label=_wrong_answer_primary_label(topic_slugs),
                diagnosis_display=get_diagnosis_display(
                    _wrong_answer_primary_label(topic_slugs)
                ),
                diagnosis_detail="wrong_answer_state_index",
                diagnosis_detail_display=get_diagnosis_detail_display("wrong_answer_state_index"),
                learner_summary="Logic chính đang lấy nhầm trạng thái, nhầm vị trí, hoặc cập nhật sai thời điểm.",
                observed_symptom=output_mismatch,
                focus_area=_state_focus_area(normalized_code),
                concept_hint="thứ tự cập nhật trạng thái, chỉ số hiện tại, và dữ liệu dùng để so sánh",
                failure_signal=failure_signal,
            )

        return DiagnosticSnapshot(
            diagnosis_label=_wrong_answer_primary_label(topic_slugs),
            diagnosis_display=get_diagnosis_display(
                _wrong_answer_primary_label(topic_slugs)
            ),
            diagnosis_detail="wrong_answer_boundary",
            diagnosis_detail_display=get_diagnosis_detail_display("wrong_answer_boundary"),
            learner_summary="Logic hiện tại bỏ sót một trường hợp biên hoặc điều kiện chuyển nhánh.",
            observed_symptom=output_mismatch,
            focus_area="nhánh xử lý input nhỏ, rỗng, phần tử đầu/cuối, hoặc trường hợp bằng nhau",
            concept_hint="điều kiện biên, nhánh đặc biệt, và giá trị khởi tạo",
            failure_signal=failure_signal,
        )

    return DiagnosticSnapshot(
        diagnosis_label="unknown",
        diagnosis_display=get_diagnosis_display("unknown"),
        diagnosis_detail="unknown",
        diagnosis_detail_display=get_diagnosis_detail_display("unknown"),
        learner_summary="Judge ghi nhận bài nộp chưa đạt, nhưng tín hiệu hiện tại chưa đủ rõ để chốt một nhóm lỗi hẹp hơn.",
        observed_symptom=_pick(
            combined_error,
            output_mismatch,
        ),
        focus_area="bước đầu tiên nơi giá trị thực tế bắt đầu lệch khỏi điều bài toán yêu cầu",
        concept_hint="đối chiếu luồng dữ liệu từ input tới output ở test đang fail",
        failure_signal=failure_signal,
    )


def classify_verdict(
    verdict: dict,
    topic_slugs: list[str] | None = None,
    source_code: str = "",
) -> str | None:
    """Compatibility wrapper that returns the diagnosis label only."""
    status = ((verdict.get("status") or "")).lower()
    if "accepted" in status:
        return None
    diagnosis_label = diagnose_submission(
        verdict,
        topic_slugs=topic_slugs,
        source_code=source_code,
    ).diagnosis_label
    if diagnosis_label not in SUPPORTED_HINT_LABELS:
        return None
    return diagnosis_label


def _looks_like_compile_error(combined_error: str) -> bool:
    lowered = combined_error.lower()
    return any(
        token in lowered
        for token in (
            "syntaxerror",
            "compilation",
            "expected",
            "undeclared",
            "cannot find symbol",
        )
    )


def _looks_like_recursion_error(status: str, combined_error: str) -> bool:
    if (
        "runtime" not in status
        and "sig" not in status
        and "internal error" not in status
    ):
        return False
    return any(pattern.search(combined_error) for pattern in _RECURSION_PATTERNS)


def _looks_like_runtime_reference(status: str, combined_error: str) -> bool:
    if (
        "runtime" not in status
        and "sig" not in status
        and "internal error" not in status
    ):
        return False
    return any(pattern.search(combined_error) for pattern in (_INDEX_PATTERNS + _REFERENCE_PATTERNS)) or True


def _looks_like_format_issue(actual_output: str, expected_output: str) -> bool:
    if not actual_output or not expected_output:
        return False
    if actual_output.strip() == expected_output.strip():
        return actual_output != expected_output
    compact_actual = _normalize_format(actual_output)
    compact_expected = _normalize_format(expected_output)
    return compact_actual == compact_expected


def _looks_like_state_or_index_issue(
    topic_slugs: list[str],
    normalized_code: str,
    actual_output: str,
    expected_output: str,
) -> bool:
    if any(token in normalized_code for token in ("[i", "[j", "enumerate", "range(", "while ", "for ")):
        return True
    if any(slug in topic_slugs for slug in ALGORITHM_TOPICS):
        return True
    if actual_output and expected_output and any(ch.isdigit() for ch in actual_output + expected_output):
        return True
    return False


def _wrong_answer_primary_label(topic_slugs: list[str]) -> str:
    if any(slug in topic_slugs for slug in MATH_TOPICS):
        return "logic_calculation_error"
    if any(slug in topic_slugs for slug in ALGORITHM_TOPICS):
        return "algorithm_design_error"
    return "boundary_condition_error"


def _runtime_focus_area(normalized_code: str, combined_error: str) -> str:
    if any(pattern.search(combined_error) for pattern in _INDEX_PATTERNS) or "[" in normalized_code:
        return "điểm truy cập mảng, danh sách, hoặc chuỗi ngay trước khi lỗi xảy ra"
    if any(pattern.search(combined_error) for pattern in _REFERENCE_PATTERNS):
        return "đoạn dùng giá trị có thể rỗng, chưa khởi tạo, hoặc khác kiểu mong đợi"
    return "bước truy cập dữ liệu hoặc gọi hàm ngay trước khi chương trình dừng"


def _state_focus_area(normalized_code: str) -> str:
    if "dp" in normalized_code or "memo" in normalized_code:
        return "bước cập nhật trạng thái và giá trị lấy từ trạng thái trước đó"
    if any(token in normalized_code for token in ("left", "right", "mid", "i", "j")):
        return "biến chỉ số hoặc con trỏ được cập nhật trong mỗi vòng lặp"
    if "return" in normalized_code:
        return "điều kiện quyết định thời điểm trả kết quả"
    return "bước chọn giá trị để so sánh hoặc đưa vào kết quả cuối"


def _compose_output_mismatch(actual_output: str, expected_output: str) -> str:
    if actual_output and expected_output:
        return f"Kết quả thực tế lệch với output mong đợi: nhận '{_short(actual_output)}' thay vì '{_short(expected_output)}'."
    if expected_output:
        return f"Output hiện tại chưa khớp với kết quả mong đợi '{_short(expected_output)}'."
    return "Output hiện tại chưa khớp với yêu cầu của judge."


def _compose_failure_signal(failing_input: str, actual_output: str, expected_output: str) -> str:
    parts: list[str] = []
    if failing_input:
        parts.append(f"Input fail: {_short(failing_input)}")
    if actual_output:
        parts.append(f"Actual: {_short(actual_output)}")
    if expected_output:
        parts.append(f"Expected: {_short(expected_output)}")
    return " | ".join(parts) if parts else "Judge chưa cung cấp đủ dữ liệu đầu vào/đầu ra cho ca fail này."


def _short(value: str, limit: int = 120) -> str:
    collapsed = " ".join(value.split())
    return collapsed if len(collapsed) <= limit else collapsed[: limit - 3] + "..."


def _pick(primary: str, fallback: str) -> str:
    return primary if primary else fallback


def _normalize_format(value: str) -> str:
    collapsed = " ".join(value.split())
    collapsed = re.sub(r"\[\s*", "[", collapsed)
    collapsed = re.sub(r"\s*\]", "]", collapsed)
    collapsed = re.sub(r"\{\s*", "{", collapsed)
    collapsed = re.sub(r"\s*\}", "}", collapsed)
    collapsed = re.sub(r",\s*", ",", collapsed)
    return collapsed
