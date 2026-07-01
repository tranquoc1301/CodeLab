import asyncio
import json
import logging
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.submission_hint import SubmissionHint
from app.services.hint_diagnostics import (
    DiagnosticSnapshot,
    SUPPORTED_HINT_LABELS,
    diagnose_submission,
)
from app.services.llm_client import call_llm_json
from app.services.llm_hint_prompts import (
    MAX_FIELD_LENGTH,
    build_full_prompt,
    get_hint_level_spec,
    get_level_response_schema,
)

logger = logging.getLogger(__name__)

FIELD_MAX_LENGTH = MAX_FIELD_LENGTH
LLM_MAX_TOKENS = 400
HINT_PAYLOAD_VERSION = 8

FORBIDDEN_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"```"),
    re.compile(r"\bcomplete\s+(working\s+)?solution\b", re.IGNORECASE),
    re.compile(r"\bfull\s+(correct\s+)?algorithm\b", re.IGNORECASE),
    re.compile(r"\bcopy\s+and\s+paste\b", re.IGNORECASE),
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

    payload = await _generate_hint_payload(
        next_level=next_level,
        snapshot=snapshot,
        verdict=verdict,
        source_code=source_code,
        problem_description=problem_description,
        language=language,
        previous_hints=[hint for hint in (hint_row.hint_1, hint_row.hint_2) if hint],
    )

    _store_hint_payload(hint_row, next_level, payload, snapshot)
    await db.commit()
    await db.refresh(hint_row)
    return payload


def parse_validate_format_hint(
    raw_content: str,
    level: int,
    diagnostic_snapshot: DiagnosticSnapshot | None = None,
) -> dict:
    data = _load_json_object(raw_content)
    hint_text = _extract_hint_text(data)
    return _build_public_hint_response(level, hint_text, diagnostic_snapshot)


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


async def _generate_hint_payload(
    *,
    next_level: int,
    snapshot: DiagnosticSnapshot,
    verdict: dict,
    source_code: str,
    problem_description: str,
    language: str,
    previous_hints: list[str],
) -> dict:
    system_prompt, user_content = build_full_prompt(
        next_level=next_level,
        diagnostic_snapshot=snapshot,
        verdict=verdict,
        source_code=source_code,
        problem_description=problem_description,
        language=language,
        include_error_context=next_level != 1,
        previous_hints=previous_hints,
    )

    llm_output = await _call_llm(
        level=next_level,
        system_prompt=system_prompt,
        user_content=user_content,
        settings=get_settings(),
    )
    return parse_validate_format_hint(
        llm_output,
        next_level,
        diagnostic_snapshot=snapshot,
    )

async def _call_llm(
    *,
    level: int,
    system_prompt: str,
    user_content: str,
    settings,
) -> str:
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            content = await call_llm_json(
                system_prompt=system_prompt,
                user_content=user_content,
                settings=settings,
                max_tokens=LLM_MAX_TOKENS,
                temperature=0.0,
                response_schema=get_level_response_schema(level),
            )
            if content:
                return content
            last_error = ValueError("LLM returned empty response")
        except Exception as exc:
            last_error = exc
        if attempt < 2:
            await asyncio.sleep(1.5 * (attempt + 1))
    raise ValueError("Lỗi kết nối LLM, vui lòng thử lại sau vài giây.") from last_error


def _load_json_object(raw_content: str) -> dict:
    if not raw_content:
        raise ValueError("empty response")

    last_error: json.JSONDecodeError | None = None
    for candidate in _json_candidates(raw_content):
        try:
            data = json.loads(candidate)
        except json.JSONDecodeError as exc:
            try:
                data, _ = json.JSONDecoder().raw_decode(candidate)
            except json.JSONDecodeError:
                last_error = exc
                continue
        if not isinstance(data, dict):
            raise ValueError("response must be a JSON object")
        if any(pattern.search(candidate) for pattern in FORBIDDEN_PATTERNS):
            raise ValueError("forbidden pattern")
        return data
        return data
    raise ValueError("malformed json") from last_error


def _json_candidates(raw_content: str) -> tuple[str, ...]:
    stripped = raw_content.strip()
    start = stripped.find("{")
    end = stripped.rfind("}")
    candidates = [stripped]
    if start != -1 and end > start:
        candidates.append(stripped[start : end + 1].strip())
    # Try extracting from markdown code fence: ```json\n{...}\n```
    fence_match = re.search(r"```(?:json)?\s*\n?(\{.*?\})\s*\n?```", stripped, re.DOTALL)
    if fence_match:
        candidates.append(fence_match.group(1).strip())
    seen: set[str] = set()
    unique_candidates: list[str] = []
    for candidate in candidates:
        if candidate and candidate not in seen:
            seen.add(candidate)
            unique_candidates.append(candidate)
    return tuple(unique_candidates)


def _extract_hint_text(data: dict) -> str:
    hint = data.get("hint")
    if not isinstance(hint, str):
        raise ValueError("response must contain 'hint' string")
    cleaned = _sanitize(hint)
    if not cleaned:
        raise ValueError("hint is empty")
    if any(pattern.search(cleaned) for pattern in FORBIDDEN_PATTERNS):
        raise ValueError("hint contains forbidden content (code fence or solution)")
    return cleaned


def _build_public_hint_response(
    level: int,
    hint_text: str,
    diagnostic_snapshot: DiagnosticSnapshot | None = None,
) -> dict:
    items = _split_hint_items(hint_text)
    if not items:
        items = [hint_text]
    return {
        "error_code": getattr(diagnostic_snapshot, "diagnosis_label", None),
        "level": level,
        "items": items,
    }


def _store_hint_payload(
    hint_row: SubmissionHint,
    level: int,
    payload: dict,
    snapshot: DiagnosticSnapshot,
) -> None:
    hint_text = "\n".join(payload["items"])
    setattr(hint_row, f"hint_{level}", hint_text)
    cached_payload = dict(payload)
    cached_payload["payload_version"] = HINT_PAYLOAD_VERSION
    setattr(hint_row, f"payload_{level}", cached_payload)
    hint_row.current_level = level
    hint_row.last_error_label = snapshot.diagnosis_label


def _normalize_cached_payload(cached_payload: dict, level: int) -> dict:
    payload = dict(cached_payload)
    items = payload.get("items")
    if not isinstance(items, list) or not items:
        raise ValueError("cached hint payload is invalid")
    normalized_items = []
    for item in items:
        if isinstance(item, str):
            sanitized = _sanitize(item)
            if sanitized:
                normalized_items.append(sanitized)
    if not normalized_items:
        raise ValueError("cached hint payload is invalid")
    return {
        "error_code": payload.get("error_code"),
        "level": level,
        "items": normalized_items,
        "payload_version": payload.get("payload_version") or HINT_PAYLOAD_VERSION,
    }



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


def _sanitize(value: str) -> str:
    collapsed = value.strip()
    # Preserve \n but collapse other whitespace
    lines = collapsed.split("\n")
    lines = [" ".join(line.split()) for line in lines]
    collapsed = "\n".join(line for line in lines if line)
    if len(collapsed) > FIELD_MAX_LENGTH:
        collapsed = collapsed[:FIELD_MAX_LENGTH].rstrip()
    return collapsed


def _split_hint_items(text: str) -> list[str]:
    items = [line.strip() for line in text.split("\n") if line.strip()]
    if len(items) >= 2:
        return items
    # Fallback: split on Vietnamese sentence terminators when LLM returns one paragraph
    parts = [part.strip() for part in re.split(r"(?<=[\.!?])\s+", text.strip()) if part.strip()]
    return parts or [text.strip()]


def _unsupported_hint_message(snapshot: DiagnosticSnapshot) -> str:
    if snapshot.unsupported_reason == "compile_error":
        return "Hint hiện chỉ hỗ trợ các nhóm lỗi đã cấu hình, không áp dụng cho lỗi biên dịch."
    return "Hint chỉ được tạo khi bài nộp được phân loại vào một trong các nhóm lỗi đã cấu hình."
