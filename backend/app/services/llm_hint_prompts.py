from __future__ import annotations

from dataclasses import dataclass

from app.services.hint_diagnostics import DiagnosticSnapshot

MAX_FIELD_LENGTH = 500


@dataclass(frozen=True)
class HintLevelSpec:
    level: int
    objective: str
    rules: tuple[str, ...]


SYSTEM_PROMPT = """\
Bạn là một gia sư lập trình cho nền tảng chấm điểm trực tuyến CodeLab.

## Nhiệm vụ
Hãy tạo ra ĐÚNG MỘT gợi ý cho học sinh vừa nộp một bài không đúng.
Toàn bộ nội dung gợi ý PHẢI viết bằng tiếng Việt.

## Định dạng trả về
Trả về ĐÚNG một đối tượng JSON với duy nhất khóa "hint".
Giá trị của "hint" là một chuỗi gồm ĐÚNG 3 câu, ngăn cách nhau bằng ký tự "\n".

## Ràng buộc
- Chỉ dùng ngữ cảnh được cung cấp. Không bịa thêm hidden tests, hidden constraints, hay thông tin ngoài ngữ cảnh.
- Không dùng markdown fences, backticks hoặc bất kỳ đoạn văn bản nào ngoài JSON.
- Viết tự nhiên, rõ ràng, dễ hiểu bằng tiếng Việt.
- Tuân thủ đúng 3 mức tiến dần:
  Level 1 → nhận diện triệu chứng
  Level 2 → thu hẹp vùng code nghi ngờ
  Level 3 → chỉ ra lỗi cụ thể và hướng sửa chính xác
"""

HINT_LEVEL_SPECS: dict[int, HintLevelSpec] = {
    1: HintLevelSpec(
        level=1,
        objective="Giúp học sinh nhận ra điều gì đang sai và xác định nhóm lỗi chính.",
        rules=(
            "Viết đúng 3 câu, mỗi câu thể hiện một ý:",
            "1. Mô tả triệu chứng lỗi nhìn thấy được từ output hoặc hành vi chạy chương trình.",
            "2. Phân loại lỗi ở mức khái quát: logic, biên, thứ tự cập nhật trạng thái, hoặc thuật toán.",
            "3. Khuyến học sinh kiểm tra lại phần suy luận hoặc luồng xử lý từ input sang output.",
            "KHÔNG gợi ý cách sửa cụ thể, KHÔNG nhắc tên biến hoặc biểu thức cụ thể trong code.",
        ),
    ),
    2: HintLevelSpec(
        level=2,
        objective="Giúp học sinh định vị vùng code cần tập trung kiểm tra.",
        rules=(
            "Viết đúng 3 câu, mỗi câu thể hiện một ý:",
            "1. Chỉ đến khối code nghi ngờ: tên hàm, vòng lặp, hoặc nhánh điều kiện có khả năng chứa lỗi. Không nhắc dòng cụ thể hay biểu thức chi tiết.",
            "2. Mô tả loại sai lệch có thể tồn tại ở vùng đó: biến chỉ số, điều kiện so sánh, hay thứ tự cập nhật.",
            "3. Đưa hướng kiểm tra khái quát trong vùng đó mà không tiết lộ cách sửa.",
            "BẮT BUỘC nhắc tên một hàm hoặc khối (ví dụ: 'hàm ...', 'vòng lặp while'), nhưng KHÔNG nhắc tên biến cụ thể.",
        ),
    ),
    3: HintLevelSpec(
        level=3,
        objective="Chỉ ra lỗi cụ thể và đề xuất cách sửa chính xác trong code hiện tại.",
        rules=(
            "Viết đúng 3 câu, mỗi câu thể hiện một ý:",
            "1. Nêu biểu thức, điều kiện hoặc thao tác đang sai.",
            "2. Đề xuất cách sửa cụ thể.",
            "3. Giải thích vì sao cách sửa đó sẽ khớp kết quả mong đợi.",
            "Có thể nhắc tên biến, biểu thức, hoặc giá trị cụ thể. KHÔNG dán đoạn code hoàn chỉnh.",
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
                "description": f"Gợi ý level {level}, viết bằng tiếng Việt, gồm đúng 3 câu ngăn cách bằng ký tự '\n'.",
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
    lines: list[str] = []

    lines.append(f"Kết quả: {verdict.get('status', 'Unknown')}")
    lines.append(f"Ngôn ngữ: {language}")
    if include_error_context:
        lines.append(f"Phân loại lỗi: {diagnostic_snapshot.diagnosis_detail_display}")

    lines.append("")
    lines.append(f"[Đề bài]\n{_truncate(problem_description, 600)}")
    lines.append(f"[Bài học sinh]\n{_truncate(source_code, 2200)}")

    lines.append("")
    lines.append("[Thông tin chẩn đoán]")
    lines.append(f"  Tóm tắt:       {diagnostic_snapshot.learner_summary}")
    lines.append(f"  Triệu chứng:   {diagnostic_snapshot.observed_symptom}")
    lines.append(f"  Vùng nghi ngờ: {diagnostic_snapshot.focus_area}")
    lines.append(f"  Khái niệm:     {diagnostic_snapshot.concept_hint}")
    lines.append(f"  Tín hiệu lỗi:  {diagnostic_snapshot.failure_signal}")

    error_lines = []
    for label, value in (
        ("Thông báo lỗi", _truncate(verdict.get("stderr"), 350)),
        ("Lỗi", _truncate(verdict.get("error_message"), 200)),
        ("Input test", _truncate(verdict.get("stdin"), 220)),
        ("Output thực tế", _truncate(verdict.get("stdout"), 220)),
        ("Output mong đợi", _truncate(verdict.get("expected_output"), 220)),
    ):
        if value.strip():
            error_lines.append(f"  {label}: {value}")
    if error_lines:
        lines.append("")
        lines.append("[Chi tiết lỗi]")
        lines.extend(error_lines)

    if previous_hints:
        lines.append("")
        lines.append("[Gợi ý trước]")
        for index, hint in enumerate(previous_hints, start=1):
            lines.append(f"  Level {index}: {_truncate(hint, 240)}")

    return lines


def _build_instruction_lines(spec: HintLevelSpec) -> list[str]:
    return [
        "--- NHIỆM VỤ ---",
        f"Level: {spec.level}",
        f"Mục tiêu: {spec.objective}",
        "",
        "--- QUY TẮC ---",
        *[f"  {rule}" for rule in spec.rules],
        "",
        "--- ĐỊNH DẠNG TRẢ VỀ ---",
        "  Viết đúng 3 câu, mỗi câu trên 1 dòng, ngăn cách bằng ký tự '\n'.",
        "  Không dùng Markdown, backticks, hay danh sách có số thứ tự.",
        "  Mỗi câu phải ngắn gọn, rõ ràng, tự nhiên bằng tiếng Việt.",
        "  Toàn bộ nội dung gợi ý PHẢI bằng tiếng Việt.",
        "",
        "--- VÍ DỤ PHẢN HỒI ---",
        '{"hint":"Câu 1.\nCâu 2.\nCâu 3."}',
    ]


def _truncate(value: str | None, limit: int) -> str:
    return (value or "")[:limit]
