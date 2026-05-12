import json
import logging
import re

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.submission_hint import SubmissionHint
from app.services.hint_diagnostics import (
    DiagnosticSnapshot,
    diagnose_submission,
    get_diagnosis_display,
    SUPPORTED_HINT_LABELS,
)
from app.services.llm_hint_prompts import (
    FALLBACK_MESSAGE,
    build_full_prompt,
)

logger = logging.getLogger(__name__)
OBSERVE_STAGE = "observe"
FOCUS_STAGE = "focus"
CORRECT_STAGE = "correct"
LEVEL_CARD_LABELS = {
    1: ("Quan sát lỗi", "Dấu hiệu", "Câu hỏi tự kiểm tra"),
    2: ("Khoanh vùng", "Khái niệm liên quan", "Câu hỏi tự kiểm tra"),
    3: ("Điểm lệch cụ thể", "Hướng sửa", "Vì sao hướng này đúng"),
}
HINT_FIELD_MAP = {
    1: ("observation", "impact", "question"),
    2: ("focus_area", "concept", "question"),
    3: ("exact_issue", "next_step", "why_it_works"),
}
EXHAUSTED_HINT_MESSAGE = (
    "Bài nộp này đã nhận đủ 3 mức gợi ý. Bạn cần submit phiên bản code mới để bắt đầu chuỗi hint mới."
)

HINT_JSON_SCHEMAS = {
    1: ("observation", "impact", "question"),
    2: ("focus_area", "concept", "question"),
    3: ("exact_issue", "next_step", "why_it_works"),
}
FIELD_MAX_LENGTH = 350
LLM_MAX_TOKENS = 650
STAGE_MAP = {1: OBSERVE_STAGE, 2: FOCUS_STAGE, 3: CORRECT_STAGE}
FORBIDDEN_PATTERNS_ALL_LEVELS: tuple[re.Pattern, ...] = (
    re.compile(r"```"),
    re.compile(r"\bcomplete\s+(working\s+)?solution\b", re.IGNORECASE),
    re.compile(r"\bfull\s+(correct\s+)?algorithm\b", re.IGNORECASE),
    re.compile(r"\bcopy\s+and\s+paste\b", re.IGNORECASE),
    re.compile(r"\bline\s+\d+\b", re.IGNORECASE),
)
FORBIDDEN_PATTERNS_EARLY_LEVELS: tuple[re.Pattern, ...] = (
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
    """Return the next tutor hint level for a submission."""
    logger.info(f"request_next_hint called: user={user_id}, submission={submission_id}")

    stmt = select(SubmissionHint).where(
        SubmissionHint.user_id == user_id,
        SubmissionHint.submission_id == submission_id,
    )
    result = await db.execute(stmt)
    hint_row = result.scalar_one_or_none()
    
    if hint_row is None:
        logger.info(f"No existing hint row found. Creating new hint row for user={user_id}, submission={submission_id}")
        hint_row = SubmissionHint(
            user_id=user_id,
            submission_id=submission_id,
            current_level=0,
        )
        db.add(hint_row)
        await db.flush()
        await db.commit()
        stmt = select(SubmissionHint).where(
            SubmissionHint.user_id == user_id,
            SubmissionHint.submission_id == submission_id,
        )
        result = await db.execute(stmt)
        hint_row = result.scalar_one()
        logger.info(f"Created hint row with id={hint_row.id}, current_level={hint_row.current_level}")
    else:
        logger.info(f"Found existing hint row id={hint_row.id}, current_level={hint_row.current_level}")
    if hint_row.current_level >= 3:
        logger.info(f"Hints exhausted for submission={submission_id}")
        return _build_exhausted_payload(
            hint_level=3,
            diagnosis_label=hint_row.last_error_label,
        )

    next_level = hint_row.current_level + 1
    logger.info(f"Next level will be: {next_level}")

    cached_hint = getattr(hint_row, f"hint_{next_level}", None)
    cached_payload = getattr(hint_row, f"payload_{next_level}", None)
    if cached_hint:
        logger.info(f"Returning cached hint_{next_level} for submission={submission_id}")
        hint_row.current_level = next_level
        await db.flush()
        await db.commit()
        await db.refresh(hint_row)
        if cached_payload:
            return _normalize_cached_payload(cached_payload, cached_hint, next_level, hint_row.last_error_label)
        snapshot = DiagnosticSnapshot(
            diagnosis_label=hint_row.last_error_label or "unknown",
            diagnosis_display=get_diagnosis_display(hint_row.last_error_label or "unknown"),
            diagnosis_detail="unknown",
            diagnosis_detail_display="Chưa đủ tín hiệu",
            learner_summary="Hệ thống đang dùng lại hint đã cache cho bài nộp này.",
            observed_symptom="Hint cũ đã được lưu trước đó.",
            focus_area="vùng logic đã được gợi ý ở mức trước",
            concept_hint="đối chiếu lại ca fail hiện tại",
            failure_signal="",
        )
        return _build_hint_response(
            next_level,
            _fallback_data(next_level, snapshot),
            snapshot,
            exhausted=next_level >= 3,
        )

    diagnostic_snapshot = diagnose_submission(
        verdict,
        topic_slugs=topic_slugs,
        source_code=source_code,
    )
    if diagnostic_snapshot.diagnosis_label not in SUPPORTED_HINT_LABELS:
        raise ValueError(_unsupported_hint_message(diagnostic_snapshot))

    system_prompt, user_content = _build_prompt(
        next_level=next_level,
        diagnostic_snapshot=diagnostic_snapshot,
        verdict=verdict,
        source_code=source_code,
        problem_description=problem_description,
        language=language,
        previous_hints=_collect_previous_hints(hint_row),
    )
    
    settings = get_settings()
    llm_output = await _call_llm(system_prompt, user_content, settings)
    try:
        hint_payload = parse_validate_format_hint(
            llm_output,
            next_level,
            diagnostic_snapshot=diagnostic_snapshot,
        )
    except ValueError as e:
        logger.warning(
            "Invalid LLM hint output for submission=%s level=%s length=%s reason=%s preview=%r",
            submission_id,
            next_level,
            len(llm_output or ""),
            e,
            _preview_llm_output(llm_output),
        )
        hint_row.current_level = next_level
        hint_row.last_error_label = diagnostic_snapshot.diagnosis_label
        await db.flush()
        await db.commit()
        await db.refresh(hint_row)
        fallback_payload = _build_hint_response(
            next_level,
            _fallback_data(next_level, diagnostic_snapshot),
            diagnostic_snapshot,
            exhausted=next_level >= 3,
        )
        return fallback_payload
    
    logger.info(
        "Saving hint_%s for submission=%s. Hint length: %s",
        next_level,
        submission_id,
        len(hint_payload["hint"]) if hint_payload["hint"] else 0,
    )
    setattr(hint_row, f"hint_{next_level}", hint_payload["hint"])
    setattr(hint_row, f"payload_{next_level}", hint_payload)
    hint_row.current_level = next_level
    hint_row.last_error_label = diagnostic_snapshot.diagnosis_label
    await db.flush()
    await db.commit()
    await db.refresh(hint_row)
    logger.info(f"After commit: current_level={hint_row.current_level}")
    return hint_payload


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


async def _call_llm(system_prompt: str, user_content: str, settings) -> str:
    """Call the LLM API and fall back to a canned response on failure."""
    if not settings.LLM_API_KEY:
        logger.warning("LLM_API_KEY not configured, returning fallback message")
        return FALLBACK_MESSAGE
    
    try:
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT) as client:
            response = await client.post(
                f"{settings.LLM_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.LLM_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    "max_tokens": LLM_MAX_TOKENS,
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            data = response.json()
            choices = data.get("choices", [])
            if choices and len(choices) > 0:
                message = choices[0].get("message", {})
                content = message.get("content", "")
                if content:
                    return content.strip()
            
            logger.warning("LLM returned empty response")
            return FALLBACK_MESSAGE
            
    except httpx.TimeoutException:
        logger.warning("LLM request timed out")
        return FALLBACK_MESSAGE
    except httpx.HTTPStatusError as e:
        logger.error("LLM HTTP error: %s", e.response.status_code)
        return FALLBACK_MESSAGE
    except Exception as e:
        logger.exception("Unexpected error calling LLM: %s", e)
        return FALLBACK_MESSAGE


def parse_validate_format_hint(
    raw_content: str,
    level: int,
    diagnostic_snapshot: DiagnosticSnapshot,
) -> dict:
    schema = HINT_JSON_SCHEMAS.get(level)
    if schema is None:
        raise ValueError("unsupported hint level")
    if not raw_content:
        raise ValueError("empty response")
    patterns = FORBIDDEN_PATTERNS_ALL_LEVELS
    if level < 3:
        patterns = patterns + FORBIDDEN_PATTERNS_EARLY_LEVELS
    if any(pattern.search(raw_content) for pattern in patterns):
        raise ValueError("forbidden pattern")
    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError as e:
        raise ValueError("malformed json") from e
    if not isinstance(data, dict):
        raise ValueError("response is not a json object")
    keys = set(data.keys())
    expected = set(schema)
    if keys != expected:
        missing = expected - keys
        extra = keys - expected
        raise ValueError(f"schema mismatch missing={sorted(missing)} extra={sorted(extra)}")
    cleaned = {}
    for field in schema:
        value = data[field]
        if not isinstance(value, str):
            raise ValueError(f"{field} is not a string")
        cleaned_value = _sanitize_field(value)
        if not cleaned_value:
            raise ValueError(f"{field} is empty")
        if any(pattern.search(cleaned_value) for pattern in patterns):
            raise ValueError(f"{field} contains forbidden pattern")
        cleaned[field] = cleaned_value
    return _build_hint_response(level, cleaned, diagnostic_snapshot, exhausted=level >= 3)


def build_fallback_hint(level: int, diagnostic_snapshot: DiagnosticSnapshot) -> dict:
    return _build_hint_response(
        level,
        _fallback_data(level, diagnostic_snapshot),
        diagnostic_snapshot,
        exhausted=level >= 3,
    )


def _preview_llm_output(value: str | None) -> str:
    return " ".join((value or "").split())[:300]


def _sanitize_field(value: str) -> str:
    lines = [" ".join(line.split()) for line in value.strip().splitlines()]
    cleaned = "\n".join(line for line in lines if line)
    if len(cleaned) > FIELD_MAX_LENGTH:
        cleaned = cleaned[:FIELD_MAX_LENGTH].rstrip()
    return cleaned


def _format_hint(level: int, data: dict[str, str]) -> str:
    return "\n".join(
        f"{index}. {label}: {data[field]}"
        for index, (label, field) in enumerate(
            zip(LEVEL_CARD_LABELS[level], HINT_FIELD_MAP[level]),
            start=1,
        )
    )


def _build_hint_response(
    level: int,
    data: dict[str, str],
    diagnostic_snapshot: DiagnosticSnapshot,
    exhausted: bool,
) -> dict:
    cards = _build_cards(level, data)
    return {
        "hint": _format_hint(level, data),
        "hint_level": level,
        "exhausted": exhausted,
        "stage": STAGE_MAP[level],
        "diagnosis_label": diagnostic_snapshot.diagnosis_label,
        "diagnosis_detail": diagnostic_snapshot.diagnosis_detail,
        "cards": cards,
    }


def _build_cards(level: int, data: dict[str, str]) -> list[dict[str, str]]:
    return [
        {"label": label, "content": data[field]}
        for label, field in zip(LEVEL_CARD_LABELS[level], HINT_FIELD_MAP[level])
    ]


def _fallback_data(level: int, diagnostic_snapshot: DiagnosticSnapshot) -> dict[str, str]:
    if level == 1:
        return {
            "observation": diagnostic_snapshot.learner_summary,
            "impact": diagnostic_snapshot.observed_symptom,
            "question": f"Nếu lần theo ca fail này, ở bước nào trong lập luận của bạn kết quả bắt đầu lệch khỏi yêu cầu bài toán?",
        }
    if level == 2:
        return {
            "focus_area": diagnostic_snapshot.focus_area,
            "concept": diagnostic_snapshot.concept_hint,
            "question": f"Tại vùng này, giá trị hoặc điều kiện nào đang được dùng khác với điều bạn thực sự muốn so sánh ở ca fail?",
        }
    return {
        "exact_issue": f"Hãy kiểm tra lại {diagnostic_snapshot.focus_area} vì đây là nơi phù hợp nhất với triệu chứng hiện tại.",
        "next_step": f"Giữ nguyên ý tưởng chung, nhưng sửa cách bạn lấy hoặc cập nhật giá trị ở vùng đó để nó bám sát ca fail: {diagnostic_snapshot.failure_signal}",
        "why_it_works": "Khi vùng logic này dùng đúng giá trị và đúng thời điểm cập nhật, output sẽ khớp hơn với tín hiệu fail mà judge đang trả về.",
    }


def _collect_previous_hints(hint_row: SubmissionHint) -> list[str]:
    return [hint for hint in (hint_row.hint_1, hint_row.hint_2) if hint]


def _normalize_cached_payload(
    cached_payload: dict,
    cached_hint: str,
    hint_level: int,
    diagnosis_label: str | None,
) -> dict:
    payload = dict(cached_payload)
    payload.setdefault("hint", cached_hint)
    payload.setdefault("hint_level", hint_level)
    payload.setdefault("exhausted", hint_level >= 3)
    payload.setdefault("stage", STAGE_MAP[hint_level])
    payload.setdefault("diagnosis_label", diagnosis_label)
    payload.setdefault("diagnosis_detail", None)
    payload.setdefault("cards", [])
    return payload


def _build_exhausted_payload(hint_level: int, diagnosis_label: str | None) -> dict:
    return {
        "hint": None,
        "hint_level": hint_level,
        "exhausted": True,
        "stage": STAGE_MAP[hint_level],
        "diagnosis_label": diagnosis_label,
        "diagnosis_detail": None,
        "cards": [
            {
                "label": "Đã dùng hết 3 mức",
                "content": EXHAUSTED_HINT_MESSAGE,
            }
        ],
    }


def _unsupported_hint_message(snapshot: DiagnosticSnapshot) -> str:
    if snapshot.diagnosis_detail == "compile_syntax":
        return "Hint hiện chỉ hỗ trợ các nhóm lỗi đã cấu hình, không áp dụng cho lỗi biên dịch."
    return "Hint chỉ được tạo khi bài nộp được phân loại vào một trong các nhóm lỗi đã cấu hình."
