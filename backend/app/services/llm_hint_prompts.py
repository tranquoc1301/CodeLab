from dataclasses import dataclass

from app.services.hint_diagnostics import DiagnosticSnapshot


RAW_HINT_JSON_EXAMPLE = (
    '{"items":["Sai ở bước cập nhật giá trị trung gian ngay trước khi tạo output.",'
    '"Hãy sửa lại dữ liệu hoặc điều kiện được dùng ở bước cập nhật đó cho đúng với trạng thái hiện tại.",'
    '"Sửa như vậy sẽ giúp kết quả không còn lệch khỏi expected output ở ca fail này."]}'
)


@dataclass(frozen=True)
class HintLevelSpec:
    level: int
    objective: str
    rules: tuple[str, ...]


SYSTEM_PROMPT = """Bạn là tutor lập trình cho nền tảng online judge CodeLab.
Bạn chỉ được tạo nội dung hint cho học viên bằng tiếng Việt tự nhiên.

Quy tắc bắt buộc:
- Nội dung hint cho học viên phải luôn là tiếng Việt tự nhiên
- Tất cả chuỗi bên trong mảng items phải là tiếng Việt
- Không được xuất hiện tiếng Anh trong JSON hint cho học viên
- Nếu bất kỳ item nào không phải tiếng Việt thì câu trả lời đó là không hợp lệ
- Chỉ dùng thông tin có trong context: đề bài, code đã nộp, verdict, stderr, input fail, actual output, expected output, và snapshot chẩn đoán
- Không bịa hidden test, hidden constraint, hoặc yêu cầu ngoài context
- Giữ đúng tiến trình 3 mức: quan sát lỗi -> khoanh vùng lỗi -> hướng sửa
- Level 1 chỉ nói ở mức khái quát, không chỉ thẳng vị trí code và không nói cách sửa
- Level 2 thu hẹp vùng logic cần soi và khuyến khích học viên tự kiểm tra
- Level 3 được phép chỉ rõ biến, biểu thức, hoặc vùng logic sai và nói thẳng cách sửa
- Dù ở Level 3, vẫn không được đưa full patch, full code, hay full algorithm
- Mỗi level phải bám vào lỗi thật trong code hiện tại, không được đưa gợi ý chung chung có thể dùng cho nhiều bài khác nhau
- Nếu context đã đủ rõ về hàm, biến, điều kiện, vòng lặp, hoặc biểu thức sai thì Level 2 và đặc biệt Level 3 phải bám vào đúng chỗ đó
- Nếu một câu hint có thể áp nguyên xi cho nhiều lời giải sai khác nhau, thì câu đó là không đạt yêu cầu
- Ưu tiên chỉ ra nguyên nhân gần nhất tạo ra triệu chứng sai, không nói lan man sang vùng ít liên quan
- Câu chữ phải ngắn, thẳng, rõ nghĩa, tránh vòng vo và tránh nhắc lại cùng một ý theo ba cách khác nhau
- Mỗi level phải có vai trò riêng để học viên nhìn vào là hiểu mức đó đang giúp gì
- Không dùng Markdown fence
- Không giải thích ngoài JSON
- Chỉ trả về JSON hợp lệ duy nhất
- JSON phải có đúng một key là items
- items phải là mảng gồm đúng 3 chuỗi ngắn bằng tiếng Việt
- Ba câu trong items phải phản ánh đúng level hiện tại, không được viết cùng một kiểu cho cả 3 level
"""


HINT_LEVEL_SPECS: dict[int, HintLevelSpec] = {
    1: HintLevelSpec(
        level=1,
        objective="Giúp học viên nhìn ra triệu chứng đang lộ ra và vùng nghi ngờ rộng, nhưng chưa chỉ thẳng chỗ code hay cách sửa.",
        rules=(
            "Câu 1 nêu triệu chứng sai ở mức rộng.",
            "Câu 2 nêu hậu quả đang thấy ở ca fail hiện tại.",
            "Câu 3 mời học viên tự rà lại lập luận hoặc giả định đang dùng, không đưa cách sửa.",
            "Không được nêu tên hàm, biến, hay biểu thức cụ thể ở level này.",
        ),
    ),
    2: HintLevelSpec(
        level=2,
        objective="Giúp học viên khoanh vùng logic cần soi, biết mình nên kiểm tra chỗ nào và kiểm tra điều gì, nhưng chưa nói thẳng cách sửa.",
        rules=(
            "Câu 1 phải thu hẹp vào một vùng logic hoặc nhóm thao tác đáng nghi trong code hiện tại.",
            "Câu 2 nêu loại lệch cần đối chiếu ở đúng vùng đó.",
            "Câu 3 phải chỉ rõ học viên nên kiểm tra giá trị, điều kiện, hoặc trạng thái nào, nhưng chưa được nói cách sửa trực tiếp.",
            "Nếu đã nhìn ra hàm hoặc khối logic sai, được phép nhắc tên hàm hoặc vai trò của khối đó.",
        ),
    ),
    3: HintLevelSpec(
        level=3,
        objective="Chỉ rõ chỗ sai nhất có thể, nói thẳng cần sửa gì, và giải thích ngắn việc sửa đó sẽ gỡ triệu chứng hiện tại như thế nào mà không đưa nguyên đáp án.",
        rules=(
            "Câu 1 phải trả lời theo tinh thần 'Sai ở đâu' và nêu rõ biến, biểu thức, điều kiện, hoặc vùng logic đang sai nếu context đã đủ rõ.",
            "Câu 2 phải trả lời theo tinh thần 'Sửa thế nào' và nói thẳng cần đổi gì hoặc xử lý khác ở đâu.",
            "Câu 3 phải trả lời theo tinh thần 'Vì sao sửa vậy' và nối trực tiếp với triệu chứng ở ca fail hiện tại.",
            "Ưu tiên chỉ ra hàm, vòng lặp, điều kiện, hoặc cập nhật con trỏ/chỉ số sai nếu lỗi nằm ở đó.",
            "Được phép nói rõ phải tăng, giảm, đổi điều kiện, hoặc đổi nguồn dữ liệu nào, nhưng không paste nguyên đoạn code hoàn chỉnh.",
        ),
    ),
}

FALLBACK_MESSAGE = ""


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

    context_lines = [
        f"Verdict: {verdict.get('status', 'Unknown')}",
        f"Language: {language}",
        f"Problem: {_truncate(problem_description, 700)}",
        "Student code:",
        _truncate(source_code, 2600),
    ]

    if include_error_context:
        context_lines.insert(1, f"Diagnosis label: {diagnostic_snapshot.diagnosis_detail_display}")

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
        ("Error message", _truncate(verdict.get("error_message"), 250)),
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

    instructions = "\n".join(
        [
            f"Current level: {spec.level}",
            f"Goal: {spec.objective}",
            "Rules:",
            *[f"- {rule}" for rule in spec.rules],
            "Level writing frame:",
            *[f"- {frame}" for frame in _level_writing_frame(spec.level)],
            "Quality check before answering:",
            "- Hãy tự kiểm tra xem 3 câu của bạn có thật sự bám vào code hiện tại hay vẫn còn quá chung chung.",
            "- Nếu Level 2 hoặc 3 vẫn có thể dùng nguyên cho nhiều bài sai khác nhau, hãy viết lại cụ thể hơn.",
            "- Nếu code đã cho thấy rõ hàm hoặc thao tác sai, hãy neo hint vào đúng chỗ đó.",
            "- Level 3 không được né tránh: phải cho học viên nhìn ra rõ điểm sai và hướng sửa, nhưng dừng trước mức đưa nguyên lời giải.",
            "Return exactly this JSON shape:",
            RAW_HINT_JSON_EXAMPLE,
        ]
    )
    return SYSTEM_PROMPT, f"{'\n'.join(context_lines)}\n\n{instructions}"


def get_hint_level_spec(level: int) -> HintLevelSpec:
    return HINT_LEVEL_SPECS.get(level, HINT_LEVEL_SPECS[1])


def _truncate(value: str | None, limit: int) -> str:
    return (value or "")[:limit]


def _level_writing_frame(level: int) -> tuple[str, ...]:
    if level == 1:
        return (
            "Câu 1 = triệu chứng đang lộ ra.",
            "Câu 2 = hậu quả ở ca fail hiện tại.",
            "Câu 3 = hướng tự rà lại lập luận, chưa nói cách sửa.",
        )
    if level == 2:
        return (
            "Câu 1 = vùng logic cần soi kỹ hơn.",
            "Câu 2 = giá trị, điều kiện, hoặc trạng thái đang đáng nghi ở vùng đó.",
            "Câu 3 = học viên nên kiểm tra cụ thể điều gì tại chỗ đó.",
        )
    return (
        "Câu 1 = Sai ở đâu.",
        "Câu 2 = Sửa thế nào.",
        "Câu 3 = Vì sao sửa vậy.",
    )


__all__ = [
    "FALLBACK_MESSAGE",
    "HINT_LEVEL_SPECS",
    "RAW_HINT_JSON_EXAMPLE",
    "SYSTEM_PROMPT",
    "build_full_prompt",
    "get_hint_level_spec",
]
