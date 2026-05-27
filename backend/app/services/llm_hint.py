import json
import logging
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.submission_hint import SubmissionHint
from app.services.llm_client import call_llm_json
from app.services.hint_diagnostics import (
    DiagnosticSnapshot,
    SUPPORTED_HINT_LABELS,
    diagnose_submission,
)
from app.services.llm_hint_prompts import (
    FALLBACK_MESSAGE,
    build_full_prompt,
)

logger = logging.getLogger(__name__)

FIELD_MAX_LENGTH = 220
LLM_MAX_TOKENS = 1000
ITEM_COUNT = 3
HINT_PAYLOAD_VERSION = 3

FORBIDDEN_PATTERNS_ALL_LEVELS: tuple[re.Pattern[str], ...] = (
    re.compile(r"```"),
    re.compile(r"\bcomplete\s+(working\s+)?solution\b", re.IGNORECASE),
    re.compile(r"\bfull\s+(correct\s+)?algorithm\b", re.IGNORECASE),
    re.compile(r"\bcopy\s+and\s+paste\b", re.IGNORECASE),
    re.compile(r"\bline\s+\d+\b", re.IGNORECASE),
)
FORBIDDEN_PATTERNS_EARLY_LEVELS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\boptimi[sz](e|ation)\b", re.IGNORECASE),
)


async def request_next_hint(
    db: AsyncSession,
    user_id: int,
    submission_id: int,
    verdict: dict,
    topic_slugs: list[str],
    source_code: str = "",
    problem_description: str = "",
    language: str = "python",
) -> dict:
    hint_row = await _get_or_create_hint_row(db, user_id, submission_id)
    if _hint_row_has_stale_payloads(hint_row):
        _reset_hint_row(hint_row)
        await db.commit()
        await db.refresh(hint_row)

    if hint_row.current_level >= 3:
        cached_payload = getattr(hint_row, "payload_3", None)
        if cached_payload:
            return _normalize_cached_payload(cached_payload, 3)
        raise ValueError("Bài nộp này đã dùng hết 3 mức gợi ý.")

    next_level = hint_row.current_level + 1
    cached_payload = getattr(hint_row, f"payload_{next_level}", None)
    if cached_payload:
        hint_row.current_level = next_level
        await db.commit()
        await db.refresh(hint_row)
        return _normalize_cached_payload(cached_payload, next_level)

    snapshot = diagnose_submission(verdict, topic_slugs=topic_slugs, source_code=source_code)
    if snapshot.diagnosis_label not in SUPPORTED_HINT_LABELS:
        raise ValueError(_unsupported_hint_message(snapshot))

    deterministic_payload = _build_deterministic_hint(next_level, snapshot, source_code)
    if deterministic_payload is not None:
        setattr(hint_row, f"hint_{next_level}", _serialize_hint_items(deterministic_payload["items"]))
        setattr(hint_row, f"payload_{next_level}", _cache_payload(deterministic_payload))
        hint_row.current_level = next_level
        hint_row.last_error_label = snapshot.diagnosis_label
        await db.commit()
        await db.refresh(hint_row)
        return deterministic_payload

    system_prompt, user_content = build_full_prompt(
        next_level=next_level,
        diagnostic_snapshot=snapshot,
        verdict=verdict,
        source_code=source_code,
        problem_description=problem_description,
        language=language,
        include_error_context=next_level != 1,
        previous_hints=_collect_previous_hints(hint_row),
    )

    llm_output = await _call_llm(system_prompt, user_content, get_settings())
    try:
        payload = parse_validate_format_hint(llm_output, next_level, diagnostic_snapshot=snapshot)
    except ValueError as exc:
        logger.warning(
            "Invalid LLM hint output for submission=%s level=%s reason=%s preview=%r",
            submission_id,
            next_level,
            exc,
            _preview(llm_output),
        )
        payload = build_fallback_hint(next_level, snapshot, source_code=source_code)

    setattr(hint_row, f"hint_{next_level}", _serialize_hint_items(payload["items"]))
    setattr(hint_row, f"payload_{next_level}", _cache_payload(payload))
    hint_row.current_level = next_level
    hint_row.last_error_label = snapshot.diagnosis_label
    await db.commit()
    await db.refresh(hint_row)
    return payload


def parse_validate_format_hint(
    raw_content: str,
    level: int,
    diagnostic_snapshot: DiagnosticSnapshot | None = None,
) -> dict:
    items = _parse_items(raw_content, level)
    _validate_level_specificity(items, level)
    return _build_public_hint_response(level, items, diagnostic_snapshot)


def build_fallback_hint(
    level: int,
    diagnostic_snapshot: DiagnosticSnapshot,
    source_code: str = "",
) -> dict:
    return _build_public_hint_response(
        level,
        _fallback_items(level, diagnostic_snapshot, source_code),
        diagnostic_snapshot,
    )


def _build_prompt(
    next_level: int,
    diagnostic_snapshot: DiagnosticSnapshot,
    verdict: dict,
    source_code: str,
    problem_description: str,
    language: str = "python",
    previous_hints: list[str] | None = None,
) -> tuple[str, str]:
    return build_full_prompt(
        next_level=next_level,
        diagnostic_snapshot=diagnostic_snapshot,
        verdict=verdict,
        source_code=source_code,
        problem_description=problem_description,
        language=language,
        include_error_context=next_level != 1,
        previous_hints=previous_hints,
    )


async def _get_or_create_hint_row(
    db: AsyncSession,
    user_id: int,
    submission_id: int,
) -> SubmissionHint:
    stmt = select(SubmissionHint).where(
        SubmissionHint.user_id == user_id,
        SubmissionHint.submission_id == submission_id,
    )
    result = await db.execute(stmt)
    hint_row = result.scalar_one_or_none()

    if hint_row is None:
        hint_row = SubmissionHint(
            user_id=user_id,
            submission_id=submission_id,
            current_level=0,
        )
        db.add(hint_row)
        await db.flush()

    return hint_row


async def _call_llm(system_prompt: str, user_content: str, settings) -> str:
    try:
        content = await call_llm_json(
            system_prompt=system_prompt,
            user_content=user_content,
            settings=settings,
            max_tokens=LLM_MAX_TOKENS,
            temperature=0.1,
        )
        if content:
            return content
        return FALLBACK_MESSAGE
    except Exception:
        logger.exception("Unexpected error calling LLM")
        return FALLBACK_MESSAGE


def _parse_items(raw_content: str, level: int) -> list[str]:
    if not raw_content:
        raise ValueError("empty response")
    patterns = _forbidden_patterns(level)
    if any(pattern.search(raw_content) for pattern in patterns):
        raise ValueError("forbidden pattern")

    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        raise ValueError("malformed json") from exc

    if not isinstance(data, dict) or set(data.keys()) != {"items"}:
        raise ValueError("response must contain exactly one key: items")

    items = data["items"]
    if not isinstance(items, list) or len(items) != ITEM_COUNT:
        raise ValueError("items must contain exactly 3 entries")

    cleaned_items: list[str] = []
    for item in items:
        if not isinstance(item, str):
            raise ValueError("item is not a string")
        cleaned_item = _sanitize(item)
        if not cleaned_item:
            raise ValueError("item is empty")
        if any(pattern.search(cleaned_item) for pattern in patterns):
            raise ValueError("item contains forbidden pattern")
        cleaned_items.append(cleaned_item)
    return cleaned_items


def _build_public_hint_response(
    level: int,
    items: list[str],
    diagnostic_snapshot: DiagnosticSnapshot | None = None,
) -> dict:
    return {
        "error_code": getattr(diagnostic_snapshot, "diagnosis_label", None),
        "level": level,
        "items": items,
    }


def _normalize_cached_payload(cached_payload: dict, level: int) -> dict:
    payload = dict(cached_payload)
    payload["error_code"] = payload.get("error_code") or payload.get("diagnosis_label")
    payload.setdefault("level", level)
    payload["payload_version"] = payload.get("payload_version") or 1
    payload["items"] = _extract_items_from_cached_payload(payload)
    for key in ("stage", "title", "diagnosis_label", "diagnosis_detail", "next_enabled", "cards", "hint", "hint_level", "exhausted"):
        payload.pop(key, None)
    return payload


def _fallback_items(level: int, snapshot: DiagnosticSnapshot, source_code: str) -> list[str]:
    anchored_items = _source_code_specific_fallback(level, source_code)
    if anchored_items is not None:
        return anchored_items

    fallback_by_level = {
        1: [
            snapshot.learner_summary,
            snapshot.observed_symptom,
            "Hãy rà lại giả định hoặc bước suy luận ngay trước khi kết quả cuối cùng được tạo ra.",
        ],
        2: [
            f"Vùng cần soi kỹ hơn là {snapshot.focus_area}.",
            f"Điểm dễ lệch ở vùng này thường liên quan đến {snapshot.concept_hint}.",
            "Hãy kiểm tra lại giá trị, điều kiện, hoặc trạng thái ngay tại vùng này trước khi đi tiếp.",
        ],
        3: [
            f"Sai ở {snapshot.focus_area}.",
            f"Hãy sửa cách lấy, so sánh, hoặc cập nhật giá trị ở vùng này theo đúng {snapshot.concept_hint}.",
            "Sửa như vậy sẽ giúp bước này dùng đúng dữ liệu và đúng điều kiện để kết quả cuối khớp lại với ca fail hiện tại.",
        ],
    }
    return fallback_by_level.get(level, fallback_by_level[1])


def _build_deterministic_hint(
    level: int,
    diagnostic_snapshot: DiagnosticSnapshot,
    source_code: str,
) -> dict | None:
    anchored_items = _source_code_specific_fallback(level, source_code)
    if anchored_items is None:
        return None
    return _build_public_hint_response(level, anchored_items, diagnostic_snapshot)


def _collect_previous_hints(hint_row: SubmissionHint) -> list[str]:
    return [hint for hint in (hint_row.hint_1, hint_row.hint_2) if hint]


def _serialize_hint_items(items: list[str]) -> str:
    return "\n".join(f"{index}. {item}" for index, item in enumerate(items, start=1))


def _cache_payload(payload: dict) -> dict:
    cached = dict(payload)
    cached["payload_version"] = HINT_PAYLOAD_VERSION
    return cached


def _hint_row_has_stale_payloads(hint_row: SubmissionHint) -> bool:
    for level in (1, 2, 3):
        payload = getattr(hint_row, f"payload_{level}", None)
        if payload and payload.get("payload_version") != HINT_PAYLOAD_VERSION:
            return True
    return False


def _reset_hint_row(hint_row: SubmissionHint) -> None:
    hint_row.current_level = 0
    hint_row.hint_1 = None
    hint_row.hint_2 = None
    hint_row.hint_3 = None
    hint_row.payload_1 = None
    hint_row.payload_2 = None
    hint_row.payload_3 = None


def _source_code_specific_fallback(level: int, source_code: str) -> list[str] | None:
    normalized_code = source_code.lower()

    if _looks_like_wrong_carry_base_in_add_two_numbers(normalized_code):
        if level == 1:
            return [
                "Phần cộng từng chữ số đang lệch ở bước tách chữ số mới và số nhớ cho lượt kế tiếp.",
                "Vì vậy kết quả có thể đúng ở vài nút đầu nhưng bắt đầu sai khi phép cộng cần truyền số nhớ.",
                "Hãy rà lại quy tắc tách tổng hiện tại thành `digit` và `carry` trước khi tạo node mới.",
            ]
        if level == 2:
            return [
                "Vùng cần soi là đoạn tính `sum`, `digit`, và đặc biệt là `carry` trong mỗi vòng lặp của `addTwoNumbers`.",
                "Ở bài cộng hai số theo từng chữ số, `digit` và `carry` phải được tách theo cùng một cơ số; nếu một bên theo 10 mà bên kia theo số khác thì kết quả sẽ lệch ngay.",
                "Hãy kiểm tra xem công thức cập nhật `carry` có đang dùng cùng cơ số với `digit = sum % 10` hay không.",
            ]
        return [
            "Sai ở dòng cập nhật `carry`: bạn đang dùng `carry = sum // 12` trong khi chữ số mới lại được lấy bằng `sum % 10`.",
            "Hãy sửa công thức này để `carry` cũng tách theo cơ số 10, tức là ăn khớp với cách bạn đang lấy `digit`.",
            "Sửa như vậy sẽ giúp các lượt cộng có nhớ như `5 + 5`, `9 + 1`, hoặc chuỗi nhớ liên tiếp tạo ra đúng các node tiếp theo.",
        ]

    if _looks_like_unbalanced_two_pointer_check(normalized_code):
        if level == 1:
            return [
                "Phần kiểm tra palindrome đang lệch ở cách duyệt hai đầu chuỗi.",
                "Vì vậy một số chuỗi đối xứng hợp lệ vẫn có thể bị kết luận là không phải palindrome.",
                "Hãy rà lại cách hai con trỏ được cập nhật sau mỗi lần so sánh.",
            ]
        if level == 2:
            return [
                "Vùng cần soi là hàm `isPalindrome` và hai con trỏ `left`/`right` trong vòng lặp kiểm tra.",
                "Sau mỗi lần so khớp, hai đầu chuỗi phải cùng tiến vào giữa; nếu chỉ một phía thay đổi thì phép kiểm tra sẽ lệch.",
                "Hãy kiểm tra xem trong vòng lặp bạn đã cập nhật cả `left` lẫn `right` sau mỗi lần so sánh chưa.",
            ]
        return [
            "Sai ở chỗ trong `isPalindrome()` bạn đang tăng `left` nhưng chưa giảm `right` sau mỗi lần so khớp.",
            "Hãy thêm bước giảm `right` để mỗi vòng lặp luôn so đúng cặp ký tự đối xứng từ hai đầu chuỗi.",
            "Sửa như vậy sẽ giúp hai con trỏ cùng tiến về giữa để các chuỗi như `abba` được nhận diện đúng là palindrome.",
        ]

    return None


def _looks_like_unbalanced_two_pointer_check(normalized_code: str) -> bool:
    left_update = any(token in normalized_code for token in ("++left", "left++", "left +=", "left = left +"))
    right_update = any(token in normalized_code for token in ("--right", "right--", "right -=", "right = right -"))
    has_two_pointer_names = "left" in normalized_code and "right" in normalized_code
    has_palindrome_compare = any(
        pattern in normalized_code
        for pattern in ("str[left] != str[right]", "s[left] != s[right]", "str[left] == str[right]", "s[left] == s[right]")
    )
    return has_two_pointer_names and has_palindrome_compare and left_update != right_update


def _looks_like_wrong_carry_base_in_add_two_numbers(normalized_code: str) -> bool:
    if "carry" not in normalized_code or "% 10" not in normalized_code:
        return False
    if "addtwonumbers" not in normalized_code and "listnode" not in normalized_code:
        return False
    return any(
        token in normalized_code
        for token in ("carry = sum // 12", "carry=sum//12", "carry = total // 12", "carry=total//12")
    )


def _validate_level_specificity(items: list[str], level: int) -> None:
    lowered_items = [item.lower() for item in items]

    if level == 1:
        if any(marker in item for item in lowered_items for marker in ("hãy sửa", "sửa thế nào", "sai ở")):
            raise ValueError("level 1 is too direct")
        return

    if level == 2:
        if any(marker in lowered_items[1] for marker in ("hãy sửa", "sửa thế nào")):
            raise ValueError("level 2 should not give the fix directly")
        if not lowered_items[2].startswith(("hãy kiểm tra", "hãy đối chiếu", "hãy xem lại", "hãy rà lại")):
            raise ValueError("level 2 needs a targeted self-check instruction")
        return

    if not lowered_items[0].startswith("sai ở"):
        raise ValueError("level 3 must identify the wrong spot directly")
    if not lowered_items[1].startswith("hãy sửa"):
        raise ValueError("level 3 must state the fix direction directly")
    if not lowered_items[2].startswith("sửa như vậy"):
        raise ValueError("level 3 must explain why the fix helps")


def _extract_items_from_cached_payload(payload: dict) -> list[str]:
    items = payload.get("items")
    if isinstance(items, list) and len(items) == ITEM_COUNT and all(isinstance(item, str) for item in items):
        return [_sanitize(item) for item in items]

    cards = payload.get("cards")
    if isinstance(cards, list):
        card_items = [
            _sanitize(card.get("content", ""))
            for card in cards
            if isinstance(card, dict) and isinstance(card.get("content"), str)
        ]
        if len(card_items) == ITEM_COUNT and all(card_items):
            return card_items

    legacy_fields = (
        payload.get("observation"),
        payload.get("impact"),
        payload.get("question"),
        payload.get("focus_area"),
        payload.get("concept"),
        payload.get("exact_issue"),
        payload.get("next_step"),
        payload.get("why_it_works"),
    )
    extracted = [_sanitize(value) for value in legacy_fields if isinstance(value, str) and _sanitize(value)]
    return extracted[:ITEM_COUNT]


def _forbidden_patterns(level: int) -> tuple[re.Pattern[str], ...]:
    if level < 3:
        return FORBIDDEN_PATTERNS_ALL_LEVELS + FORBIDDEN_PATTERNS_EARLY_LEVELS
    return FORBIDDEN_PATTERNS_ALL_LEVELS


def _sanitize(value: str) -> str:
    collapsed = " ".join(value.strip().split())
    if len(collapsed) > FIELD_MAX_LENGTH:
        collapsed = collapsed[:FIELD_MAX_LENGTH].rstrip()
    return collapsed


def _preview(value: str | None) -> str:
    return " ".join((value or "").split())[:300]


def _unsupported_hint_message(snapshot: DiagnosticSnapshot) -> str:
    if snapshot.unsupported_reason == "compile_error":
        return "Hint hiện chỉ hỗ trợ các nhóm lỗi đã cấu hình, không áp dụng cho lỗi biên dịch."
    return "Hint chỉ được tạo khi bài nộp được phân loại vào một trong các nhóm lỗi đã cấu hình."
