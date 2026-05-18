import json
import logging
import re
from dataclasses import dataclass, field

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
    LEVEL_PROMPTS,
    SYSTEM_PROMPT,
    build_full_prompt,
)

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class LevelConfig:
    fields: tuple[str, str, str]
    card_labels: tuple[str, str, str]


LEVEL_CONFIG: dict[int, LevelConfig] = {
    1: LevelConfig(
        fields=("observation", "impact", "question"),
        card_labels=("Quan sát lỗi", "Dấu hiệu", "Câu hỏi tự kiểm tra"),
    ),
    2: LevelConfig(
        fields=("focus_area", "concept", "question"),
        card_labels=("Khoanh vùng", "Khái niệm liên quan", "Câu hỏi tự kiểm tra"),
    ),
    3: LevelConfig(
        fields=("exact_issue", "next_step", "why_it_works"),
        card_labels=("Điểm lệch cụ thể", "Hướng sửa", "Vì sao hướng này đúng"),
    ),
}

STAGE_MAP = {1: "observe", 2: "focus", 3: "correct"}

EXHAUSTED_HINT_MESSAGE = (
    "Bài nộp này đã nhận đủ 3 mức gợi ý. Bạn cần submit phiên bản code mới để bắt đầu chuỗi hint mới."
)

FIELD_MAX_LENGTH = 350
LLM_MAX_TOKENS = 650

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


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


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
    hint_row = await _get_or_create_hint_row(db, user_id, submission_id)

    if hint_row.current_level >= 3:
        return _build_exhausted_payload(hint_row.last_error_label)

    next_level = hint_row.current_level + 1
    cached_hint = getattr(hint_row, f"hint_{next_level}", None)

    if cached_hint:
        hint_row.current_level = next_level
        await db.commit()
        await db.refresh(hint_row)
        cached_payload = getattr(hint_row, f"payload_{next_level}", None)
        if cached_payload:
            return _normalize_cached_payload(cached_payload, cached_hint, next_level, hint_row.last_error_label)
        return _build_cached_fallback(next_level, hint_row)

    snapshot = diagnose_submission(verdict, topic_slugs=topic_slugs, source_code=source_code)
    if snapshot.diagnosis_label not in SUPPORTED_HINT_LABELS:
        raise ValueError(_unsupported_hint_message(snapshot))

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
        hint_payload = parse_validate_format_hint(llm_output, next_level, snapshot)
    except ValueError as e:
        logger.warning(
            "Invalid LLM hint output for submission=%s level=%s length=%s reason=%s preview=%r",
            submission_id, next_level, len(llm_output or ""), e, _preview(llm_output),
        )
        hint_row.current_level = next_level
        hint_row.last_error_label = snapshot.diagnosis_label
        await db.commit()
        await db.refresh(hint_row)
        return _build_hint_response(next_level, _fallback_data(next_level, snapshot), snapshot)

    setattr(hint_row, f"hint_{next_level}", hint_payload["hint"])
    setattr(hint_row, f"payload_{next_level}", hint_payload)
    hint_row.current_level = next_level
    hint_row.last_error_label = snapshot.diagnosis_label
    await db.commit()
    await db.refresh(hint_row)
    return hint_payload


def parse_validate_format_hint(
    raw_content: str,
    level: int,
    diagnostic_snapshot: DiagnosticSnapshot,
) -> dict:
    config = LEVEL_CONFIG.get(level)
    if config is None:
        raise ValueError("unsupported hint level")
    if not raw_content:
        raise ValueError("empty response")

    patterns = _forbidden_patterns(level)
    if any(p.search(raw_content) for p in patterns):
        raise ValueError("forbidden pattern")

    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError as e:
        raise ValueError("malformed json") from e
    if not isinstance(data, dict):
        raise ValueError("response is not a json object")

    expected = set(config.fields)
    if set(data.keys()) != expected:
        missing = expected - data.keys()
        extra = data.keys() - expected
        raise ValueError(f"schema mismatch missing={sorted(missing)} extra={sorted(extra)}")

    cleaned = {}
    for f_name in config.fields:
        value = data[f_name]
        if not isinstance(value, str):
            raise ValueError(f"{f_name} is not a string")
        cleaned_value = _sanitize(value)
        if not cleaned_value:
            raise ValueError(f"{f_name} is empty")
        if any(p.search(cleaned_value) for p in patterns):
            raise ValueError(f"{f_name} contains forbidden pattern")
        cleaned[f_name] = cleaned_value

    return _build_hint_response(level, cleaned, diagnostic_snapshot)


def build_fallback_hint(level: int, diagnostic_snapshot: DiagnosticSnapshot) -> dict:
    return _build_hint_response(level, _fallback_data(level, diagnostic_snapshot), diagnostic_snapshot)


def _build_prompt(
    next_level: int,
    diagnostic_snapshot: DiagnosticSnapshot,
    verdict: dict,
    source_code: str,
    problem_description: str,
    language: str = "python",
    previous_hints: list[str] | None = None,
) -> tuple[str, str]:
    """Build prompt with error context hidden at level 1."""
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


# ---------------------------------------------------------------------------
# Internal: DB helpers
# ---------------------------------------------------------------------------


async def _get_or_create_hint_row(
    db: AsyncSession, user_id: int, submission_id: int,
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


# ---------------------------------------------------------------------------
# Internal: LLM call
# ---------------------------------------------------------------------------


async def _call_llm(system_prompt: str, user_content: str, settings) -> str:
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
            if choices:
                content = choices[0].get("message", {}).get("content", "")
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
    except Exception:
        logger.exception("Unexpected error calling LLM")
        return FALLBACK_MESSAGE


# ---------------------------------------------------------------------------
# Internal: response builders
# ---------------------------------------------------------------------------


def _build_hint_response(
    level: int,
    data: dict[str, str],
    diagnostic_snapshot: DiagnosticSnapshot,
) -> dict:
    config = LEVEL_CONFIG[level]
    return {
        "hint": _format_hint(config, data),
        "hint_level": level,
        "exhausted": level >= 3,
        "stage": STAGE_MAP[level],
        "diagnosis_label": diagnostic_snapshot.diagnosis_label,
        "diagnosis_detail": diagnostic_snapshot.diagnosis_detail,
        "cards": _build_cards(config, data),
    }


def _format_hint(config: LevelConfig, data: dict[str, str]) -> str:
    return "\n".join(
        f"{i}. {label}: {data[f_name]}"
        for i, (label, f_name) in enumerate(zip(config.card_labels, config.fields), start=1)
    )


def _build_cards(config: LevelConfig, data: dict[str, str]) -> list[dict[str, str]]:
    return [
        {"label": label, "content": data[f_name]}
        for label, f_name in zip(config.card_labels, config.fields)
    ]


def _build_exhausted_payload(diagnosis_label: str | None) -> dict:
    return {
        "hint": None,
        "hint_level": 3,
        "exhausted": True,
        "stage": STAGE_MAP[3],
        "diagnosis_label": diagnosis_label,
        "diagnosis_detail": None,
        "cards": [
            {"label": "Đã dùng hết 3 mức", "content": EXHAUSTED_HINT_MESSAGE}
        ],
    }


def _build_cached_fallback(level: int, hint_row: SubmissionHint) -> dict:
    label = hint_row.last_error_label or "unknown"
    snapshot = DiagnosticSnapshot(
        diagnosis_label=label,
        diagnosis_display=get_diagnosis_display(label),
        diagnosis_detail="unknown",
        diagnosis_detail_display="Chưa đủ tín hiệu",
        learner_summary="Hệ thống đang dùng lại hint đã cache cho bài nộp này.",
        observed_symptom="Hint cũ đã được lưu trước đó.",
        focus_area="vùng logic đã được gợi ý ở mức trước",
        concept_hint="đối chiếu lại ca fail hiện tại",
        failure_signal="",
    )
    return _build_hint_response(level, _fallback_data(level, snapshot), snapshot)


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


# ---------------------------------------------------------------------------
# Internal: fallback data
# ---------------------------------------------------------------------------


def _fallback_data(level: int, snapshot: DiagnosticSnapshot) -> dict[str, str]:
    if level == 1:
        return {
            "observation": snapshot.learner_summary,
            "impact": snapshot.observed_symptom,
            "question": "Nếu lần theo ca fail này, ở bước nào trong lập luận của bạn kết quả bắt đầu lệch khỏi yêu cầu bài toán?",
        }
    if level == 2:
        return {
            "focus_area": snapshot.focus_area,
            "concept": snapshot.concept_hint,
            "question": "Tại vùng này, giá trị hoặc điều kiện nào đang được dùng khác với điều bạn thực sự muốn so sánh ở ca fail?",
        }
    return {
        "exact_issue": f"Hãy kiểm tra lại {snapshot.focus_area} vì đây là nơi phù hợp nhất với triệu chứng hiện tại.",
        "next_step": f"Giữ nguyên ý tưởng chung, nhưng sửa cách bạn lấy hoặc cập nhật giá trị ở vùng đó để nó bám sát ca fail: {snapshot.failure_signal}",
        "why_it_works": "Khi vùng logic này dùng đúng giá trị và đúng thời điểm cập nhật, output sẽ khớp hơn với tín hiệu fail mà judge đang trả về.",
    }


# ---------------------------------------------------------------------------
# Internal: utilities
# ---------------------------------------------------------------------------


def _collect_previous_hints(hint_row: SubmissionHint) -> list[str]:
    return [h for h in (hint_row.hint_1, hint_row.hint_2) if h]


def _forbidden_patterns(level: int) -> tuple[re.Pattern, ...]:
    if level < 3:
        return FORBIDDEN_PATTERNS_ALL_LEVELS + FORBIDDEN_PATTERNS_EARLY_LEVELS
    return FORBIDDEN_PATTERNS_ALL_LEVELS


def _sanitize(value: str) -> str:
    lines = [" ".join(line.split()) for line in value.strip().splitlines()]
    cleaned = "\n".join(line for line in lines if line)
    if len(cleaned) > FIELD_MAX_LENGTH:
        cleaned = cleaned[:FIELD_MAX_LENGTH].rstrip()
    return cleaned


def _preview(value: str | None) -> str:
    return " ".join((value or "").split())[:300]


def _unsupported_hint_message(snapshot: DiagnosticSnapshot) -> str:
    if snapshot.diagnosis_detail == "compile_syntax":
        return "Hint hiện chỉ hỗ trợ các nhóm lỗi đã cấu hình, không áp dụng cho lỗi biên dịch."
    return "Hint chỉ được tạo khi bài nộp được phân loại vào một trong các nhóm lỗi đã cấu hình."
