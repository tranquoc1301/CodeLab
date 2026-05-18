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

LEVEL_PROMPTS = {
    1: (
        "Bạn đang viết Hint 1/3. Chỉ giúp học viên nhìn ra kiểu sai và hậu quả đang xảy ra.\n"
        "\n"
        'Trả về đúng JSON này:\n'
        '{"observation":"kiểu sai cần xem lại ở mức khái quát","impact":"mô tả hậu quả quan sát được từ ca fail hiện tại","question":"một câu hỏi không dẫn đáp án để học viên tự kiểm tra lập luận"}\n'
        "\n"
        "Ràng buộc:\n"
        "- Bắt buộc đủ 3 key: observation, impact, question\n"
        "- Mỗi value là chuỗi ngắn\n"
        "- Không thêm key khác\n"
        "- Không nêu tên biến, hàm, biểu thức, chỉ số, hay vị trí cụ thể trong code\n"
        "- Không nói cách sửa\n"
        "- Không nhắc lại nguyên văn diagnosis_label của hệ thống\n"
        "- Không viết gì ngoài JSON"
    ),
    2: (
        "Bạn đang viết Hint 2/3. Hãy khoanh vùng chỗ cần kiểm tra nhưng chưa giải hộ.\n"
        "\n"
        'Trả về đúng JSON này:\n'
        '{"focus_area":"vùng logic cần kiểm tra, mô tả theo vai trò","concept":"khái niệm lập trình đang bị lệch ở vùng đó","question":"một câu hỏi buộc học viên đối chiếu giá trị, điều kiện, hoặc trạng thái tại vùng đó"}\n'
        "\n"
        "Ràng buộc:\n"
        "- Bắt buộc đủ 3 key: focus_area, concept, question\n"
        "- Mỗi value là chuỗi ngắn\n"
        "- Không thêm key khác\n"
        "- Focus area phải mô tả theo vai trò logic, không copy expression từ code\n"
        "- Phải thu hẹp hơn Level 1 và không lặp lại wording của Level 1\n"
        "- Không đưa pseudo-code hay code sửa\n"
        "- Không viết gì ngoài JSON"
    ),
    3: (
        "Bạn đang viết Hint 3/3. Hãy cho hướng sửa cụ thể nhưng vẫn buộc học viên tự chỉnh code.\n"
        "\n"
        'Trả về đúng JSON này:\n'
        '{"exact_issue":"một câu chỉ rõ vùng logic hoặc biểu thức đáng nghi cần sửa","next_step":"hướng chỉnh sửa ở mức thao tác logic, không phải patch hoàn chỉnh","why_it_works":"một câu giải thích vì sao hướng này xử lý đúng triệu chứng hiện tại"}\n'
        "\n"
        "Ràng buộc:\n"
        "- Bắt buộc đủ 3 key: exact_issue, next_step, why_it_works\n"
        "- Mỗi value là chuỗi ngắn\n"
        "- Không thêm key khác\n"
        "- Được phép nói cụ thể hơn về vùng logic hoặc biểu thức đáng nghi, nhưng không paste code sửa\n"
        "- Không đưa full algorithm, full function, hay patch line-by-line\n"
        "- Không dùng các câu mơ hồ như \"kiểm tra lại ngữ cảnh fail\"\n"
        "- Không viết gì ngoài JSON"
    ),
}

FALLBACK_MESSAGE = (
    '{"observation":"Dịch vụ gợi ý tạm thời gián đoạn",'
    '"impact":"Hệ thống chưa tạo được gợi ý từ mô hình ở lần gọi này",'
    '"question":"Bạn hãy thử lại sau ít phút để nhận gợi ý phù hợp hơn."}'
)


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
    context_lines = [
        f"Verdict: {verdict.get('status', 'Unknown')}",
        f"Language: {language}",
        f"Problem: {_truncate(problem_description, 700)}",
        "Student code:",
        _truncate(source_code, 2600),
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

    for label, value in (
        ("Stderr", _truncate(verdict.get("stderr"), 400)),
        ("error_message", _truncate(verdict.get("error_message"), 250)),
        ("Failing input", _truncate(verdict.get("stdin"), 250)),
        ("Actual output", _truncate(verdict.get("stdout"), 250)),
        ("Expected output", _truncate(verdict.get("expected_output"), 250)),
    ):
        if value.strip():
            context_lines.append(f"{label}: {value}")

    if previous_hints:
        context_lines.append("Previous hints:")
        for index, hint in enumerate(previous_hints, start=1):
            context_lines.append(f"- Level {index}: {hint[:300]}")

    context = "\n".join(context_lines)
    user_prompt = LEVEL_PROMPTS.get(next_level, LEVEL_PROMPTS[1])
    return SYSTEM_PROMPT, f"{context}\n\n{user_prompt}"


def _truncate(value: str | None, limit: int) -> str:
    return (value or "")[:limit]


__all__ = [
    "SYSTEM_PROMPT",
    "LEVEL_PROMPTS",
    "FALLBACK_MESSAGE",
    "build_full_prompt",
]
