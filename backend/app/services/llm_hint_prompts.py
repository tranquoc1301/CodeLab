from dataclasses import dataclass

from app.services.hint_diagnostics import DiagnosticSnapshot


MAX_FIELD_LENGTH = 500


@dataclass(frozen=True)
class HintLevelSpec:
    level: int
    objective: str
    rules: tuple[str, ...]


SYSTEM_PROMPT = """Bạn là tutor lập trình cho nền tảng online judge CodeLab.
Bạn chỉ được trả về duy nhất một JSON object hợp lệ bằng tiếng Việt tự nhiên.

Quy tắc bắt buộc:
- Chỉ dùng thông tin có trong context: đề bài, code đã nộp, verdict, stderr, input fail, actual output, expected output, và snapshot chẩn đoán
- Không bịa hidden test, hidden constraint, hoặc yêu cầu ngoài context
- Không dùng Markdown fence, không thêm giải thích ngoài JSON, không thêm text thừa trước hoặc sau JSON
- JSON phải có đúng key "hint" chứa một chuỗi text duy nhất
- Mỗi câu phải trên một dòng riêng, dùng ký hiệu \\n để xuống dòng
- Viết bằng tiếng Việt tự nhiên, rõ ràng, dễ hiểu
- Giữ đúng tiến trình 3 mức: nhận diện lỗi -> khoanh vùng -> đưa hướng sửa
"""


HINT_LEVEL_SPECS: dict[int, HintLevelSpec] = {
    1: HintLevelSpec(
        level=1,
        objective="Giúp học viên nhận ra triệu chứng sai và loại lỗi đang gặp.",
        rules=(
            "Viết 3 câu rõ ràng, mỗi câu một ý:",
            "1. Mô tả triệu chứng sai đang lộ ra ở output hoặc hành vi chạy.",
            "2. Mô tả loại lỗi ở mức khái quát (logic, boundary, state, algorithm).",
            "3. Mời học viên tự kiểm tra lại hướng suy luận hoặc quy trình tạo ra kết quả.",
            "KHÔNG được nói cách sửa cụ thể, KHÔNG được nhắc tên biến hay biểu thức code.",
        ),
    ),
    2: HintLevelSpec(
        level=2,
        objective="Giúp học viên khoanh đúng vùng logic cần soi trong code hiện tại.",
        rules=(
            "Viết 3 câu rõ ràng, mỗi câu một ý:",
            "1. Chỉ ra block code đáng nghi: tên hàm, vòng lặp, hoặc khối điều kiện chứa lỗi. KHÔNG chỉ dòng cụ thể hay biểu thức chi tiết.",
            "2. Mô tả loại lệch có thể xảy ra ở block đó (sai logic xử lý, sai điều kiện, sai thứ tự cập nhật).",
            "3. Hướng kiểm tra tổng quát trong block đó, chưa nói phải sửa gì.",
            "PHẢI nhắc tên hàm hoặc tên block (ví dụ: 'trong hàm threeSum', 'ở vòng lặp while') nhưng KHÔNG chỉ biến hay biểu thức cụ thể.",
        ),
    ),
    3: HintLevelSpec(
        level=3,
        objective="Chỉ rõ chỗ sai và đề xuất hướng sửa cụ thể trong code hiện tại.",
        rules=(
            "Viết 3 câu rõ ràng, mỗi câu một ý:",
            "1. Nêu rõ biểu thức, điều kiện, hoặc thao tác sai cụ thể trong code.",
            "2. Đề xuất cách sửa cụ thể (ví dụ: 'đổi sum == 0 thành sum < 0').",
            "3. Giải thích tại sao cách sửa này giúp kết quả khớp expected.",
            "Được phép nêu tên biến, biểu thức, giá trị cụ thể. KHÔNG paste full code block.",
        ),
    ),
}

__all__ = [
    "HINT_LEVEL_SPECS",
    "MAX_FIELD_LENGTH",
    "SYSTEM_PROMPT",
    "build_full_prompt",
    "get_hint_level_spec",
    "get_level_response_schema",
]


def build_full_prompt(
    next_level: int,
    diagnostic_snapshot: DiagnosticSnapshot,
    verdict: dict,
    source_code: str,
    problem_description: str,
    language: str = "python",
    include_error_context: bool = True,
    previous_hints: list[str] | None = None,
) -> tuple[str, str]:
    spec = get_hint_level_spec(next_level)
    context_lines = _build_context_lines(
        diagnostic_snapshot=diagnostic_snapshot,
        verdict=verdict,
        source_code=source_code,
        problem_description=problem_description,
        language=language,
        include_error_context=include_error_context,
        previous_hints=previous_hints or [],
    )
    instruction_lines = _build_instruction_lines(spec)
    return SYSTEM_PROMPT, "\n".join(context_lines + ["", *instruction_lines])


def get_level_response_schema(level: int) -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "hint": {
                "type": "string",
                "description": f"Text gợi ý cho level {level}, viết bằng tiếng Việt tự nhiên, gồm 3 câu mỗi câu cách nhau bằng \\n.",
                "minLength": 20,
                "maxLength": MAX_FIELD_LENGTH,
            },
        },
        "required": ["hint"],
    }


def get_hint_level_spec(level: int) -> HintLevelSpec:
    return HINT_LEVEL_SPECS.get(level, HINT_LEVEL_SPECS[1])


def _build_context_lines(
    *,
    diagnostic_snapshot: DiagnosticSnapshot,
    verdict: dict,
    source_code: str,
    problem_description: str,
    language: str,
    include_error_context: bool,
    previous_hints: list[str],
) -> list[str]:
    lines = [
        f"Verdict: {verdict.get('status', 'Unknown')}",
        f"Language: {language}",
        f"Problem: {_truncate(problem_description, 600)}",
        "Student code:",
        _truncate(source_code, 2200),
    ]
    if include_error_context:
        lines.insert(1, f"Diagnosis label: {diagnostic_snapshot.diagnosis_detail_display}")

    lines.extend(
        [
            f"Tutor summary: {diagnostic_snapshot.learner_summary}",
            f"Observed symptom: {diagnostic_snapshot.observed_symptom}",
            f"Focus area candidate: {diagnostic_snapshot.focus_area}",
            f"Concept hint: {diagnostic_snapshot.concept_hint}",
            f"Failure signal: {diagnostic_snapshot.failure_signal}",
        ]
    )

    for label, value in (
        ("Stderr", _truncate(verdict.get("stderr"), 350)),
        ("Error message", _truncate(verdict.get("error_message"), 200)),
        ("Failing input", _truncate(verdict.get("stdin"), 220)),
        ("Actual output", _truncate(verdict.get("stdout"), 220)),
        ("Expected output", _truncate(verdict.get("expected_output"), 220)),
    ):
        if value.strip():
            lines.append(f"{label}: {value}")

    if previous_hints:
        lines.append("Previous hints:")
        for index, hint in enumerate(previous_hints, start=1):
            lines.append(f"- Level {index}: {_truncate(hint, 240)}")
    return lines


def _build_instruction_lines(spec: HintLevelSpec) -> list[str]:
    return [
        f"Current level: {spec.level}",
        f"Goal: {spec.objective}",
        "Rules:",
        *[f"- {rule}" for rule in spec.rules],
        "Output format:",
        "- Viết 3 câu, mỗi câu trên một dòng riêng (dùng \\n để xuống dòng).",
        "- KHÔNG dùng Markdown, KHÔNG dùng backtick, KHÔNG đánh số câu.",
        "- Mỗi câu phải ngắn gọn, rõ ràng, dễ hiểu.",
        "Return exactly this JSON shape:",
        '{"hint":"Câu 1.\\nCâu 2.\\nCâu 3."}',
    ]


def _truncate(value: str | None, limit: int) -> str:
    return (value or "")[:limit]
