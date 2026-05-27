from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum


class CanonicalErrorLabel(str, Enum):
    LOGIC_CALCULATION_ERROR = "logic_calculation_error"
    COMPLEXITY_ERROR = "complexity_error"
    MEMORY_REFERENCE_ERROR = "memory_reference_error"
    RECURSION_ERROR = "recursion_error"
    ALGORITHM_DESIGN_ERROR = "algorithm_design_error"
    BOUNDARY_CONDITION_ERROR = "boundary_condition_error"


DIAGNOSIS_LABELS: dict[CanonicalErrorLabel, str] = {
    CanonicalErrorLabel.LOGIC_CALCULATION_ERROR: "Logic & Calculation Error",
    CanonicalErrorLabel.COMPLEXITY_ERROR: "Complexity & TLE Error",
    CanonicalErrorLabel.MEMORY_REFERENCE_ERROR: "Memory & Reference Error",
    CanonicalErrorLabel.RECURSION_ERROR: "Recursion Error",
    CanonicalErrorLabel.ALGORITHM_DESIGN_ERROR: "Algorithm Design Error",
    CanonicalErrorLabel.BOUNDARY_CONDITION_ERROR: "Boundary & Edge Case Error",
}

UNKNOWN_DIAGNOSIS_DISPLAY = "Insufficient Signal"
CANONICAL_ERROR_LABELS: tuple[CanonicalErrorLabel, ...] = tuple(CanonicalErrorLabel)
SUPPORTED_HINT_LABELS: frozenset[str] = frozenset(label.value for label in CANONICAL_ERROR_LABELS)

ALGORITHM_TOPICS: frozenset[str] = frozenset(
    {
        "dynamic-programming", "dp",
        "graph", "tree", "binary-tree", "binary-search-tree",
        "breadth-first-search", "bfs", "depth-first-search", "dfs",
        "greedy", "backtracking", "divide-and-conquer",
        "sorting", "binary-search",
        "heap", "priority-queue", "trie",
        "union-find", "disjoint-set",
        "segment-tree", "topological-sort",
        "shortest-path", "minimum-spanning-tree",
        "two-pointers", "sliding-window",
        "monotonic-stack", "monotonic-queue",
        "linked-list", "stack", "queue", "hash-table",
        "string", "array",
    }
)

MATH_TOPICS: frozenset[str] = frozenset(
    {
        "math", "mathematics",
        "bit-manipulation", "bitwise",
        "number-theory", "combinatorics", "geometry",
        "modular-arithmetic", "prime",
        "greatest-common-divisor", "gcd",
        "least-common-multiple", "lcm",
        "probability", "statistics",
    }
)

_COMPILE_TOKENS = ("syntaxerror", "compilation", "expected", "undeclared", "cannot find symbol")

_RECURSION_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in ("recursion", "maximum recursion depth exceeded", "stack overflow", "stackoverflowerror")
]

_INDEX_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in ("index", "out of range", "out of bounds", "subscript")
]

_REFERENCE_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in ("null", "none", "attributeerror", "typeerror", "sigsegv", "segmentation fault", "nil")
]

_RUNTIME_MARKERS = ("runtime", "sig", "internal error")


@dataclass(slots=True)
class DiagnosticSnapshot:
    diagnosis_label: CanonicalErrorLabel | None
    diagnosis_display: str
    diagnosis_detail: CanonicalErrorLabel | None
    diagnosis_detail_display: str
    learner_summary: str
    observed_symptom: str
    focus_area: str
    concept_hint: str
    failure_signal: str
    unsupported_reason: str | None = None


@dataclass(slots=True)
class VerdictContext:
    normalized_status: str
    normalized_code: str
    topic_slugs: list[str]
    combined_error: str
    actual_output: str
    expected_output: str
    failure_signal: str
    output_mismatch: str


def get_canonical_error_labels() -> tuple[str, ...]:
    return tuple(label.value for label in CANONICAL_ERROR_LABELS)


def is_canonical_error_label(label: str | None) -> bool:
    return label in SUPPORTED_HINT_LABELS


def get_diagnosis_display(label: str | CanonicalErrorLabel | None) -> str:
    canonical = _coerce_canonical_label(label)
    if canonical is None:
        return UNKNOWN_DIAGNOSIS_DISPLAY
    return DIAGNOSIS_LABELS[canonical]


def get_diagnosis_detail_display(detail: str | CanonicalErrorLabel | None) -> str:
    return get_diagnosis_display(detail)


def diagnose_submission(
    verdict: dict,
    topic_slugs: list[str] | None = None,
    source_code: str = "",
) -> DiagnosticSnapshot:
    status = (verdict.get("status") or "").strip()
    stderr = (verdict.get("stderr") or "").strip()
    error_message = (verdict.get("error_message") or "").strip()
    actual_output = (verdict.get("stdout") or "").strip()
    expected_output = (verdict.get("expected_output") or "").strip()
    failing_input = (verdict.get("stdin") or "").strip()

    context = VerdictContext(
        normalized_status=status.lower(),
        normalized_code=source_code.lower(),
        topic_slugs=[s.lower() for s in (topic_slugs or [])],
        combined_error=" ".join(part for part in (stderr, error_message) if part),
        actual_output=actual_output,
        expected_output=expected_output,
        failure_signal=_compose_failure_signal(failing_input, actual_output, expected_output),
        output_mismatch=_compose_output_mismatch(actual_output, expected_output),
    )

    if _is_compile(context.normalized_status, context.combined_error):
        return _compile_snapshot(context)
    if _is_tle(context.normalized_status):
        return _tle_snapshot(context)
    if _is_recursion(context.normalized_status, context.combined_error):
        return _recursion_snapshot(context)
    if _is_runtime(context.normalized_status, context.combined_error):
        return _runtime_snapshot(context)
    if _is_wrong_answer(context.normalized_status):
        return _classify_wrong_answer(context)
    return _insufficient_signal_snapshot(context)


def classify_verdict(
    verdict: dict,
    topic_slugs: list[str] | None = None,
    source_code: str = "",
) -> CanonicalErrorLabel | None:
    """Return one canonical error label, or None for accepted/unsupported cases."""
    if "accepted" in (verdict.get("status") or "").lower():
        return None
    return diagnose_submission(verdict, topic_slugs, source_code).diagnosis_label


def _compile_snapshot(context: VerdictContext) -> DiagnosticSnapshot:
    return _snapshot(
        label=None,
        learner_summary="Bài nộp chưa chạy được vì trình biên dịch hoặc thông dịch dừng lại trước khi vào logic chính.",
        observed_symptom=_pick(context.combined_error, "Thông báo lỗi xuất hiện ngay ở bước biên dịch hoặc phân tích cú pháp."),
        focus_area="câu lệnh hoặc biểu thức vừa được thêm gần vị trí báo lỗi",
        concept_hint="cú pháp, kiểu dữ liệu, hoặc chữ ký hàm",
        failure_signal=context.failure_signal,
        unsupported_reason="compile_error",
    )


def _tle_snapshot(context: VerdictContext) -> DiagnosticSnapshot:
    return _snapshot(
        label=CanonicalErrorLabel.COMPLEXITY_ERROR,
        learner_summary="Bài nộp đúng hướng xử lý cơ bản nhưng đang tốn quá nhiều bước trên input lớn.",
        observed_symptom="Chương trình không hoàn tất trong thời gian cho phép của judge.",
        focus_area="đoạn lặp lồng nhau hoặc thao tác lặp lại trên cùng dữ liệu",
        concept_hint="độ phức tạp thời gian và số lần quét dữ liệu",
        failure_signal=context.failure_signal,
    )


def _recursion_snapshot(context: VerdictContext) -> DiagnosticSnapshot:
    return _snapshot(
        label=CanonicalErrorLabel.RECURSION_ERROR,
        learner_summary="Luồng đệ quy chưa có điều kiện dừng đủ chặt hoặc vẫn quay lại cùng trạng thái.",
        observed_symptom=_pick(context.combined_error, "Chương trình dừng với dấu hiệu tràn ngăn xếp hoặc lặp đệ quy quá sâu."),
        focus_area="điều kiện dừng và tham số truyền vào lần gọi đệ quy kế tiếp",
        concept_hint="đệ quy, trạng thái giảm dần, và base case",
        failure_signal=context.failure_signal,
    )


def _runtime_snapshot(context: VerdictContext) -> DiagnosticSnapshot:
    return _snapshot(
        label=CanonicalErrorLabel.MEMORY_REFERENCE_ERROR,
        learner_summary="Có một giá trị, chỉ số, hoặc kiểu dữ liệu bị dùng ở trạng thái không hợp lệ khi chạy.",
        observed_symptom=_pick(context.combined_error, "Chương trình dừng giữa chừng khi truy cập dữ liệu hoặc dùng sai kiểu giá trị."),
        focus_area=_runtime_focus_area(context.normalized_code, context.combined_error),
        concept_hint="kiểm tra phạm vi chỉ số, giá trị rỗng, và kiểu dữ liệu tại chỗ dùng",
        failure_signal=context.failure_signal,
    )


def _insufficient_signal_snapshot(context: VerdictContext) -> DiagnosticSnapshot:
    return _snapshot(
        label=None,
        learner_summary="Judge ghi nhận bài nộp chưa đạt, nhưng tín hiệu hiện tại chưa đủ rõ để chốt một nhóm lỗi hẹp hơn.",
        observed_symptom=_pick(context.combined_error, context.output_mismatch),
        focus_area="bước đầu tiên nơi giá trị thực tế bắt đầu lệch khỏi điều bài toán yêu cầu",
        concept_hint="đối chiếu luồng dữ liệu từ input tới output ở test đang fail",
        failure_signal=context.failure_signal,
        unsupported_reason="insufficient_signal",
    )


def _classify_wrong_answer(context: VerdictContext) -> DiagnosticSnapshot:
    label = _primary_label(context.topic_slugs)

    if _is_format_issue(context.actual_output, context.expected_output):
        return _snapshot(
            label=CanonicalErrorLabel.BOUNDARY_CONDITION_ERROR,
            learner_summary="Kết quả gần đúng về nội dung nhưng khác quy ước định dạng mà bài yêu cầu.",
            observed_symptom=context.output_mismatch,
            focus_area="bước ghép chuỗi, in kết quả, hoặc chuyển cấu trúc dữ liệu sang output",
            concept_hint="định dạng đầu ra, thứ tự phần tử, và khoảng trắng có ý nghĩa",
            failure_signal=context.failure_signal,
        )

    if _is_state_index_issue(
        context.topic_slugs,
        context.normalized_code,
        context.actual_output,
        context.expected_output,
    ):
        focus_area = _state_focus_area(context.normalized_code)
        if label is CanonicalErrorLabel.LOGIC_CALCULATION_ERROR:
            focus_area = "phép tính trung gian, giá trị tích lũy, hoặc biểu thức vừa được cập nhật"
        return _snapshot(
            label=label,
            learner_summary="Logic chính đang lấy nhầm trạng thái, nhầm vị trí, hoặc cập nhật sai thời điểm.",
            observed_symptom=context.output_mismatch,
            focus_area=focus_area,
            concept_hint="thứ tự cập nhật trạng thái, chỉ số hiện tại, và dữ liệu dùng để so sánh",
            failure_signal=context.failure_signal,
        )

    return _snapshot(
        label=label,
        learner_summary="Logic hiện tại bỏ sót một trường hợp biên hoặc điều kiện chuyển nhánh.",
        observed_symptom=context.output_mismatch,
        focus_area="nhánh xử lý input nhỏ, rỗng, phần tử đầu/cuối, hoặc trường hợp bằng nhau",
        concept_hint="điều kiện biên, nhánh đặc biệt, và giá trị khởi tạo",
        failure_signal=context.failure_signal,
    )


def _is_compile(normalized_status: str, combined_error: str) -> bool:
    if "compil" in normalized_status:
        return True
    lowered = combined_error.lower()
    return any(t in lowered for t in _COMPILE_TOKENS)


def _is_tle(normalized_status: str) -> bool:
    return "time limit" in normalized_status or "timeout" in normalized_status


def _is_recursion(normalized_status: str, combined_error: str) -> bool:
    return _has_runtime(normalized_status) and _match_any(combined_error, _RECURSION_PATTERNS)


def _is_runtime(normalized_status: str, combined_error: str) -> bool:
    del combined_error
    return _has_runtime(normalized_status)


def _is_wrong_answer(normalized_status: str) -> bool:
    return "wrong answer" in normalized_status or "format error" in normalized_status


def _has_runtime(normalized_status: str) -> bool:
    return any(m in normalized_status for m in _RUNTIME_MARKERS)


def _is_format_issue(actual_output: str, expected_output: str) -> bool:
    if not actual_output or not expected_output:
        return False
    if actual_output.strip() == expected_output.strip():
        return actual_output != expected_output
    return _normalize_format(actual_output) == _normalize_format(expected_output)


def _is_state_index_issue(
    topic_slugs: list[str],
    normalized_code: str,
    actual_output: str,
    expected_output: str,
) -> bool:
    if any(t in normalized_code for t in ("[i", "[j", "enumerate", "range(", "while ", "for ")):
        return True
    if any(s in topic_slugs for s in ALGORITHM_TOPICS):
        return True
    if actual_output and expected_output and any(ch.isdigit() for ch in actual_output + expected_output):
        return True
    return False


def _primary_label(topic_slugs: list[str]) -> CanonicalErrorLabel:
    for topics, label in (
        (MATH_TOPICS, CanonicalErrorLabel.LOGIC_CALCULATION_ERROR),
        (ALGORITHM_TOPICS, CanonicalErrorLabel.ALGORITHM_DESIGN_ERROR),
    ):
        if any(slug in topics for slug in topic_slugs):
            return label
    return CanonicalErrorLabel.BOUNDARY_CONDITION_ERROR


def _runtime_focus_area(normalized_code: str, combined_error: str) -> str:
    if _match_any(combined_error, _INDEX_PATTERNS) or "[" in normalized_code:
        return "điểm truy cập mảng, danh sách, hoặc chuỗi ngay trước khi lỗi xảy ra"
    if _match_any(combined_error, _REFERENCE_PATTERNS):
        return "đoạn dùng giá trị có thể rỗng, chưa khởi tạo, hoặc khác kiểu mong đợi"
    return "bước truy cập dữ liệu hoặc gọi hàm ngay trước khi chương trình dừng"


def _state_focus_area(normalized_code: str) -> str:
    if "dp" in normalized_code or "memo" in normalized_code:
        return "bước cập nhật trạng thái và giá trị lấy từ trạng thái trước đó"
    if any(t in normalized_code for t in ("left", "right", "mid", "i", "j")):
        return "biến chỉ số hoặc con trỏ được cập nhật trong mỗi vòng lặp"
    if "return" in normalized_code:
        return "điều kiện quyết định thời điểm trả kết quả"
    return "bước chọn giá trị để so sánh hoặc đưa vào kết quả cuối"


def _snapshot(
    label: CanonicalErrorLabel | None,
    learner_summary: str,
    observed_symptom: str,
    focus_area: str,
    concept_hint: str,
    failure_signal: str,
    unsupported_reason: str | None = None,
) -> DiagnosticSnapshot:
    return DiagnosticSnapshot(
        diagnosis_label=label,
        diagnosis_display=get_diagnosis_display(label),
        diagnosis_detail=label,
        diagnosis_detail_display=get_diagnosis_detail_display(label),
        learner_summary=learner_summary,
        observed_symptom=observed_symptom,
        focus_area=focus_area,
        concept_hint=concept_hint,
        failure_signal=failure_signal,
        unsupported_reason=unsupported_reason,
    )


def _compose_output_mismatch(actual: str, expected: str) -> str:
    if actual and expected:
        return f"Kết quả thực tế lệch với output mong đợi: nhận '{_short(actual)}' thay vì '{_short(expected)}'."
    if expected:
        return f"Output hiện tại chưa khớp với kết quả mong đợi '{_short(expected)}'."
    return "Output hiện tại chưa khớp với yêu cầu của judge."


def _compose_failure_signal(failing_input: str, actual: str, expected: str) -> str:
    parts: list[str] = []
    if failing_input:
        parts.append(f"Input fail: {_short(failing_input)}")
    if actual:
        parts.append(f"Actual: {_short(actual)}")
    if expected:
        parts.append(f"Expected: {_short(expected)}")
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


def _match_any(text: str, patterns: list[re.Pattern]) -> bool:
    return any(p.search(text) for p in patterns)


def _coerce_canonical_label(label: str | CanonicalErrorLabel | None) -> CanonicalErrorLabel | None:
    if isinstance(label, CanonicalErrorLabel):
        return label
    if label is None:
        return None
    try:
        return CanonicalErrorLabel(label)
    except ValueError:
        return None
