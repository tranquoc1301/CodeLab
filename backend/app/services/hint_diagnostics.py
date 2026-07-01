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
    CanonicalErrorLabel.LOGIC_CALCULATION_ERROR: "Lỗi tính toán / logic",
    CanonicalErrorLabel.COMPLEXITY_ERROR: "Lỗi độ phức tạp / quá thời gian",
    CanonicalErrorLabel.MEMORY_REFERENCE_ERROR: "Lỗi truy cập bộ nhớ / kiểu dữ liệu",
    CanonicalErrorLabel.RECURSION_ERROR: "Lỗi đệ quy",
    CanonicalErrorLabel.ALGORITHM_DESIGN_ERROR: "Lỗi cách tiếp cận thuật toán",
    CanonicalErrorLabel.BOUNDARY_CONDITION_ERROR: "Lỗi biên / trường hợp đặc biệt",
}

UNKNOWN_DIAGNOSIS_DISPLAY = "Chưa đủ tín hiệu phân loại"
CANONICAL_ERROR_LABELS: tuple[CanonicalErrorLabel, ...] = tuple(CanonicalErrorLabel)
SUPPORTED_HINT_LABELS: frozenset[str] = frozenset(label.value for label in CANONICAL_ERROR_LABELS)

ALGORITHM_TOPICS: frozenset[str] = frozenset(
    {
        "array", "hash-table", "linked-list", "recursion", "string",
        "sliding-window", "binary-search", "divide-and-conquer",
        "two-pointers", "dynamic-programming", "greedy", "trie",
        "sorting", "backtracking", "stack", "heap", "merge-sort",
        "string-matching", "matrix", "monotonic-stack", "simulation",
        "memoization", "depth-first-search", "tree", "binary-tree",
        "binary-search-tree", "breadth-first-search", "union-find",
        "graph", "doubly-linked-list", "bucket-sort", "radix-sort",
        "rolling-hash", "hash-function", "enumeration",
        "topological-sort", "prefix-sum", "quickselect",
        "binary-indexed-tree", "segment-tree", "ordered-set", "queue",
        "monotonic-queue", "counting-sort", "interactive",
        "game-theory", "eulerian-circuit", "shortest-path",
        "suffix-array", "biconnected-component",
        "minimum-spanning-tree", "strongly-connected-component", "sort",
    }
)

MATH_TOPICS: frozenset[str] = frozenset(
    {
        "math", "number-theory", "combinatorics", "counting",
        "geometry", "randomized", "reservoir-sampling",
        "rejection-sampling", "probability-and-statistics",
        "bit-manipulation", "bitmask",
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


def is_canonical_error_label(label: str | None) -> bool:
    return label in SUPPORTED_HINT_LABELS


def get_diagnosis_display(label: str | CanonicalErrorLabel | None) -> str:
    canonical = _coerce_canonical_label(label)
    if canonical is None:
        return UNKNOWN_DIAGNOSIS_DISPLAY
    return DIAGNOSIS_LABELS[canonical]


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
    if _is_format_issue(context.actual_output, context.expected_output):
        return _snapshot(
            label=CanonicalErrorLabel.BOUNDARY_CONDITION_ERROR,
            learner_summary="Kết quả gần đúng về nội dung nhưng khác quy ước định dạng mà bài yêu cầu.",
            observed_symptom=context.output_mismatch,
            focus_area="bước ghép chuỗi, in kết quả, hoặc chuyển cấu trúc dữ liệu sang output",
            concept_hint="định dạng đầu ra, thứ tự phần tử, và khoảng trắng có ý nghĩa",
            failure_signal=context.failure_signal,
        )

    from app.services.error_rules import classify_by_rules

    code = context.normalized_code
    rule_scores = classify_by_rules(code, context.topic_slugs)
    best_label: str | None = None
    best_score = 0.0
    for label, score in rule_scores.items():
        if score > best_score:
            best_score = score
            best_label = label

    label: CanonicalErrorLabel
    if best_score >= 0.4:
        label = CanonicalErrorLabel(best_label)
    else:
        label = _primary_label(context.topic_slugs)

    if best_score >= 0.4 and best_label in ("recursion_error", "complexity_error", "memory_reference_error"):
        pass

    if _is_state_index_issue(
        context.topic_slugs,
        code,
        context.actual_output,
        context.expected_output,
    ) and best_score < 0.6:
        focus_area = _state_focus_area(code)
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

    summary = _label_to_summary(label, best_label, best_score)
    focus_area, concept_hint = _label_to_focus(label, best_label)

    return _snapshot(
        label=label,
        learner_summary=summary,
        observed_symptom=context.output_mismatch,
        focus_area=focus_area,
        concept_hint=concept_hint,
        failure_signal=context.failure_signal,
    )


def _label_to_summary(label: CanonicalErrorLabel, rule_label: str | None, score: float) -> str:
    if label == CanonicalErrorLabel.RECURSION_ERROR:
        return "Hàm đệ quy chưa có base case hoặc chưa ghi nhớ trạng thái đã tính."
    if label == CanonicalErrorLabel.COMPLEXITY_ERROR:
        return "Thuật toán đang chạy quá nhiều bước lặp trên input lớn."
    if label == CanonicalErrorLabel.MEMORY_REFERENCE_ERROR:
        return "Có truy cập mảng hoặc giá trị rỗng ở vị trí không hợp lệ."
    if label == CanonicalErrorLabel.LOGIC_CALCULATION_ERROR:
        return "Phép tính hoặc điều kiện so sánh chưa đúng, dẫn đến kết quả sai."
    if label == CanonicalErrorLabel.ALGORITHM_DESIGN_ERROR:
        return "Cách tiếp cận thuật toán chưa phù hợp với bài toán."
    return "Logic hiện tại bỏ sót một trường hợp biên hoặc điều kiện chuyển nhánh."


def _label_to_focus(label: CanonicalErrorLabel, rule_label: str | None) -> tuple[str, str]:
    mapping = {
        CanonicalErrorLabel.RECURSION_ERROR: (
            "điều kiện dừng và tham số truyền vào lần gọi đệ quy kế tiếp",
            "đệ quy, trạng thái giảm dần, và base case",
        ),
        CanonicalErrorLabel.COMPLEXITY_ERROR: (
            "đoạn lặp lồng nhau hoặc thao tác lặp lại trên cùng dữ liệu",
            "độ phức tạp thời gian và số lần quét dữ liệu",
        ),
        CanonicalErrorLabel.MEMORY_REFERENCE_ERROR: (
            "điểm truy cập mảng, danh sách, hoặc giá trị có thể rỗng",
            "kiểm tra phạm vi chỉ số, giá trị rỗng, và kiểu dữ liệu tại chỗ dùng",
        ),
        CanonicalErrorLabel.LOGIC_CALCULATION_ERROR: (
            "phép tính trung gian, giá trị tích lũy, hoặc biểu thức vừa được cập nhật",
            "thứ tự cập nhật trạng thái, chỉ số hiện tại, và dữ liệu dùng để so sánh",
        ),
        CanonicalErrorLabel.ALGORITHM_DESIGN_ERROR: (
            "cấu trúc dữ liệu hoặc cách tiếp cận đang dùng",
            "độ phức tạp và cấu trúc dữ liệu phù hợp với ràng buộc input",
        ),
    }
    return mapping.get(label, (
        "nhánh xử lý input nhỏ, rỗng, phần tử đầu/cuối, hoặc trường hợp bằng nhau",
        "điều kiện biên, nhánh đặc biệt, và giá trị khởi tạo",
    ))


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
    if _has_runtime(normalized_status):
        return True
    # Fallback: some judges report runtime errors without "runtime" in status
    runtime_fallback = ("sigsegv", "sigfpe", "sigbus", "signal", "core dump", "killed")
    return any(marker in combined_error.lower() for marker in runtime_fallback)


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
    if any(s in topic_slugs for s in MATH_TOPICS):
        return True
    if actual_output and expected_output and any(ch.isdigit() for ch in actual_output + expected_output):
        return True
    return False


def _primary_label(topic_slugs: list[str]) -> CanonicalErrorLabel:
    if any(slug in MATH_TOPICS for slug in topic_slugs):
        return CanonicalErrorLabel.LOGIC_CALCULATION_ERROR
    if any(slug in ALGORITHM_TOPICS for slug in topic_slugs):
        return CanonicalErrorLabel.ALGORITHM_DESIGN_ERROR
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
        diagnosis_detail_display=get_diagnosis_display(label),
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
