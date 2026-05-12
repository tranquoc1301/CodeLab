from app.services.hint_diagnostics import DiagnosticSnapshot


SYSTEM_PROMPT = """Bạn là tutor lập trình trong một nền tảng online judge.
Nhiệm vụ của bạn là giúp học viên tự tìm ra nguyên nhân lỗi qua 3 mức gợi ý tăng dần.

Quy tắc bắt buộc:
- Chỉ dùng thông tin có trong context: đề bài, code đã nộp, verdict, stderr, input fail, actual output, expected output, và snapshot chẩn đoán
- Không bịa hidden test, hidden constraint, hoặc yêu cầu không xuất hiện trong context
- Luôn giữ tiến trình 3 mức: quan sát lỗi -> khoanh vùng -> hướng sửa
- Level 1 chỉ được nói ở mức khái quát, không chỉ thẳng biến, biểu thức, line number, hay đoạn code cụ thể
- Level 2 được mô tả vùng logic theo vai trò và đặt câu hỏi để học viên tự kiểm tra
- Level 3 được nói cụ thể hơn về vùng lỗi hoặc biểu thức đáng nghi, nhưng không được đưa patch hoàn chỉnh, code copy-paste, hay full algorithm
- Không lặp lại cùng một chẩn đoán ở các mức sau; mỗi mức phải thu hẹp phạm vi rõ hơn mức trước
- Không đưa lời khuyên chung chung ngoài lỗi hiện tại
- Không khuyên refactor hay tối ưu trừ khi đó là nguyên nhân trực tiếp
- Trả lời bằng tiếng Việt tự nhiên, giọng tutor, ngắn gọn
- Không dùng Markdown fence
- Trả về JSON hợp lệ duy nhất, không có văn bản ngoài JSON
"""

LEVEL1_USER_PROMPT = """Bạn đang viết Hint 1/3. Chỉ giúp học viên nhìn ra kiểu sai và hậu quả đang xảy ra.

Trả về đúng JSON này:
{"observation":"kiểu sai cần xem lại ở mức khái quát","impact":"mô tả hậu quả quan sát được từ ca fail hiện tại","question":"một câu hỏi không dẫn đáp án để học viên tự kiểm tra lập luận"}

Ràng buộc:
- Bắt buộc đủ 3 key: observation, impact, question
- Mỗi value là chuỗi ngắn
- Không thêm key khác
- Không nêu tên biến, hàm, biểu thức, chỉ số, hay vị trí cụ thể trong code
- Không nói cách sửa
- Không nhắc lại nguyên văn diagnosis_label của hệ thống
- Không viết gì ngoài JSON"""

LEVEL1_INSTRUCTION = "Mức 1 chỉ cho học viên thấy lỗi đang thuộc nhóm suy nghĩ nào và hậu quả hiện ra ở verdict."

LEVEL2_USER_PROMPT = """Bạn đang viết Hint 2/3. Hãy khoanh vùng chỗ cần kiểm tra nhưng chưa giải hộ.

Trả về đúng JSON này:
{"focus_area":"vùng logic cần kiểm tra, mô tả theo vai trò","concept":"khái niệm lập trình đang bị lệch ở vùng đó","question":"một câu hỏi buộc học viên đối chiếu giá trị, điều kiện, hoặc trạng thái tại vùng đó"}

Ràng buộc:
- Bắt buộc đủ 3 key: focus_area, concept, question
- Mỗi value là chuỗi ngắn
- Không thêm key khác
- Focus area phải mô tả theo vai trò logic, không copy expression từ code
- Phải thu hẹp hơn Level 1 và không lặp lại wording của Level 1
- Không đưa pseudo-code hay code sửa
- Không viết gì ngoài JSON"""

LEVEL2_INSTRUCTION = "Mức 2 phải chỉ ra đúng vùng logic cần soi lại và buộc học viên tự đối chiếu trạng thái tại đó."

LEVEL3_USER_PROMPT = """Bạn đang viết Hint 3/3. Hãy cho hướng sửa cụ thể nhưng vẫn buộc học viên tự chỉnh code.

Trả về đúng JSON này:
{"exact_issue":"một câu chỉ rõ vùng logic hoặc biểu thức đáng nghi cần sửa","next_step":"hướng chỉnh sửa ở mức thao tác logic, không phải patch hoàn chỉnh","why_it_works":"một câu giải thích vì sao hướng này xử lý đúng triệu chứng hiện tại"}

Ràng buộc:
- Bắt buộc đủ 3 key: exact_issue, next_step, why_it_works
- Mỗi value là chuỗi ngắn
- Không thêm key khác
- Được phép nói cụ thể hơn về vùng logic hoặc biểu thức đáng nghi, nhưng không paste code sửa
- Không đưa full algorithm, full function, hay patch line-by-line
- Không dùng các câu mơ hồ như "kiểm tra lại ngữ cảnh fail"
- Không viết gì ngoài JSON"""

LEVEL3_INSTRUCTION = "Mức 3 phải đủ cụ thể để học viên biết sửa ở đâu và sửa theo hướng nào, nhưng vẫn không làm thay."

HINT_LEVEL_INSTRUCTIONS = {
    1: LEVEL1_INSTRUCTION,
    2: LEVEL2_INSTRUCTION,
    3: LEVEL3_INSTRUCTION,
}

HINT_LEVEL_USER_PROMPTS = {
    1: LEVEL1_USER_PROMPT,
    2: LEVEL2_USER_PROMPT,
    3: LEVEL3_USER_PROMPT,
}
DEFAULT_ERROR_CONTEXT = "Chưa đủ tín hiệu để phân loại hẹp"
DEFAULT_LEVEL_INSTRUCTION = "Provide helpful guidance for fixing the error."

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
    truncated_description = _truncate(problem_description, 700)
    truncated_code = _truncate(source_code, 2600)
    truncated_stderr = _truncate(verdict.get("stderr"), 400)
    truncated_error_msg = _truncate(verdict.get("error_message"), 250)
    truncated_stdin = _truncate(verdict.get("stdin"), 250)
    truncated_stdout = _truncate(verdict.get("stdout"), 250)
    truncated_expected = _truncate(verdict.get("expected_output"), 250)
    previous_hints = previous_hints or []
    context_lines = [
        f"Verdict: {verdict.get('status', 'Unknown')}",
        f"Language: {language}",
        f"Problem: {truncated_description}",
        "Student code:",
        truncated_code,
    ]
    if include_error_context:
        context_lines.insert(
            1,
            f"Diagnosis label: {diagnostic_snapshot.diagnosis_detail_display}",
        )
    context_lines.extend(
        [
            f"Tutor summary: {diagnostic_snapshot.learner_summary}",
            f"Observed symptom: {diagnostic_snapshot.observed_symptom}",
            f"Focus area candidate: {diagnostic_snapshot.focus_area}",
            f"Concept hint: {diagnostic_snapshot.concept_hint}",
            f"Failure signal: {diagnostic_snapshot.failure_signal}",
        ]
    )
    optional_fields = (
        ("Stderr", truncated_stderr),
        ("error_message", truncated_error_msg),
        ("Failing input", truncated_stdin),
        ("Actual output", truncated_stdout),
        ("Expected output", truncated_expected),
    )
    for label, value in optional_fields:
        if value.strip():
            context_lines.append(f"{label}: {value}")
    if previous_hints:
        context_lines.append("Previous hints:")
        for index, hint in enumerate(previous_hints, start=1):
            context_lines.append(f"- Level {index}: {hint[:300]}")
    context = "\n".join(context_lines)
    user_prompt = HINT_LEVEL_USER_PROMPTS.get(next_level, LEVEL1_USER_PROMPT)
    user_content = f"{context}\n\n{user_prompt}"

    return SYSTEM_PROMPT, user_content


FALLBACK_MESSAGE = '{"observation":"Dịch vụ gợi ý tạm thời gián đoạn","impact":"Hệ thống chưa tạo được gợi ý từ mô hình ở lần gọi này","question":"Bạn hãy thử lại sau ít phút để nhận gợi ý phù hợp hơn."}'
ERROR_CONTEXT_MAP = {
    "compile_syntax": "Lỗi biên dịch hoặc cú pháp",
    "wrong_answer_boundary": "Sai điều kiện biên",
    "wrong_answer_state_index": "Sai chỉ số hoặc trạng thái",
    "wrong_answer_parsing_format": "Sai định dạng đầu ra",
    "runtime_reference_type": "Lỗi truy cập dữ liệu hoặc kiểu",
    "runtime_recursion": "Lỗi đệ quy",
    "tle_complexity": "Thuật toán quá chậm",
    "unknown": "Chưa đủ tín hiệu để phân loại hẹp",
}


def get_error_context(error_label: str) -> str:
    return ERROR_CONTEXT_MAP.get(error_label, DEFAULT_ERROR_CONTEXT)


def get_level_instruction(next_level: int) -> str:
    return HINT_LEVEL_INSTRUCTIONS.get(next_level, DEFAULT_LEVEL_INSTRUCTION)


def get_user_prompt(next_level: int) -> str:
    return HINT_LEVEL_USER_PROMPTS.get(next_level, LEVEL1_USER_PROMPT)


def _truncate(value: str | None, limit: int) -> str:
    return (value or "")[:limit]


__all__ = [
    "SYSTEM_PROMPT",
    "LEVEL1_USER_PROMPT",
    "LEVEL2_USER_PROMPT",
    "LEVEL3_USER_PROMPT",
    "HINT_LEVEL_INSTRUCTIONS",
    "HINT_LEVEL_USER_PROMPTS",
    "ERROR_CONTEXT_MAP",
    "FALLBACK_MESSAGE",
    "build_full_prompt",
    "get_error_context",
    "get_level_instruction",
    "get_user_prompt",
]
