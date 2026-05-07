"""LLM hint service for generating progressive hints for submissions."""

import json
import logging
import re

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.submission_hint import SubmissionHint
from app.services.error_classifier import classify_verdict
from app.services.llm_hint_prompts import (
    ERROR_CONTEXT_MAP,
    FALLBACK_MESSAGE,
    build_full_prompt,
)

logger = logging.getLogger(__name__)

HINT_JSON_SCHEMAS = {
    1: ("bug_type", "effect", "question"),
    2: ("fault_area", "concept", "question"),
    3: ("exact_issue", "pseudocode", "why_it_works"),
}
FIELD_MAX_LENGTH = 350
LLM_MAX_TOKENS = 500
FORBIDDEN_PATTERNS_ALL_LEVELS: tuple[re.Pattern, ...] = (
    re.compile(r"```"),
    re.compile(r"\bcomplete\s+(working\s+)?solution\b", re.IGNORECASE),
    re.compile(r"\bfull\s+(correct\s+)?algorithm\b", re.IGNORECASE),
    re.compile(r"\bcopy\s+and\s+paste\b", re.IGNORECASE),
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
    """Request the next hint level for a submission.
    
    Fetches or creates a SubmissionHint row for this submission, returns cached hints if available,
    or generates a new hint using the LLM.
    
    Returns:
        dict with keys: hint (str|None), hint_level (int), exhausted (bool)
    """
    logger.info(f"request_next_hint called: user={user_id}, submission={submission_id}")
    
    # Step 1: Fetch or create SubmissionHint row
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
        # Re-fetch to ensure we have a fresh instance in the session
        stmt = select(SubmissionHint).where(
            SubmissionHint.user_id == user_id,
            SubmissionHint.submission_id == submission_id,
        )
        result = await db.execute(stmt)
        hint_row = result.scalar_one()
        logger.info(f"Created hint row with id={hint_row.id}, current_level={hint_row.current_level}")
    else:
        logger.info(f"Found existing hint row id={hint_row.id}, current_level={hint_row.current_level}")
    
    # Step 2: Check if exhausted
    if hint_row.current_level >= 3:
        logger.info(f"Hints exhausted for submission={submission_id}")
        return {"hint": None, "hint_level": 3, "exhausted": True}
    
    # Step 3: Determine next level
    next_level = hint_row.current_level + 1
    logger.info(f"Next level will be: {next_level}")
    
    # Step 4: Check for cached hint
    cached_hint = getattr(hint_row, f"hint_{next_level}", None)
    if cached_hint:
        logger.info(f"Returning cached hint_{next_level} for submission={submission_id}")
        hint_row.current_level = next_level
        await db.flush()
        await db.commit()
        await db.refresh(hint_row)
        return {
            "hint": cached_hint,
            "hint_level": next_level,
            "exhausted": next_level >= 3,
        }
    
    # Step 5: Classify the error
    error_label = classify_verdict(verdict, topic_slugs)
    
    # Step 6: Build error context
    error_context = ERROR_CONTEXT_MAP.get(error_label, "Unknown error")
    
    # Step 7: Build prompt and call LLM
    system_prompt, user_content = _build_prompt(
        next_level=next_level,
        error_context=error_context,
        verdict=verdict,
        source_code=source_code,
        problem_description=problem_description,
        language=language,
    )
    
    settings = get_settings()
    llm_output = await _call_llm(system_prompt, user_content, settings)
    try:
        hint_text = parse_validate_format_hint(llm_output, next_level)
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
        hint_row.last_error_label = error_label
        await db.flush()
        await db.commit()
        await db.refresh(hint_row)
        return {
            "hint": build_fallback_hint(next_level, error_context),
            "hint_level": next_level,
            "exhausted": next_level >= 3,
        }
    
    # Step 8: Save to database
    logger.info(f"Saving hint_{next_level} for submission={submission_id}. Hint length: {len(hint_text) if hint_text else 0}")
    setattr(hint_row, f"hint_{next_level}", hint_text)
    hint_row.current_level = next_level
    hint_row.last_error_label = error_label
    logger.info(f"Before commit: current_level={hint_row.current_level}, hint_{next_level} length: {len(getattr(hint_row, f'hint_{next_level}', '') or '')}")
    await db.flush()
    await db.commit()
    await db.refresh(hint_row)
    logger.info(f"After commit: current_level={hint_row.current_level}")
    
    # Step 9: Return result
    return {
        "hint": hint_text,
        "hint_level": next_level,
        "exhausted": next_level >= 3,
    }


def _build_prompt(
    next_level: int,
    error_context: str,
    verdict: dict,
    source_code: str,
    problem_description: str,
    language: str = "python",
) -> tuple[str, str]:
    """Build a prompt for the LLM based on the hint level and context.
    
    Delegates to the prompts module for the full prompt structure.
    """
    return build_full_prompt(
        next_level=next_level,
        error_context=error_context,
        verdict=verdict,
        source_code=source_code,
        problem_description=problem_description,
        language=language,
        include_error_context=next_level != 1,
    )


async def _call_llm(system_prompt: str, user_content: str, settings) -> str:
    """Call the LLM API with the given prompt.
    
    Returns the LLM response text, or a fallback message if:
    - API key is not configured
    - Request times out
    - HTTP error occurs
    - Any other exception occurs
    
    Never raises an exception - always returns a string.
    """
    # Check if API key is configured
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
            
            # Extract the response content
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


def parse_validate_format_hint(raw_content: str, level: int) -> str:
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
    return _format_hint(level, cleaned)


def build_fallback_hint(level: int, error_context: str) -> str:
    if level == 1:
        return (
            "1. Error type: Program behavior mismatch\n"
            "2. Effect: The submission produces behavior that does not match the judge expectation for this run.\n"
            "3. Question: Which part of your reasoning connects the input values to the output your code produced?"
        )
    if level == 2:
        return (
            "1. Fault area: The code path that computes or selects the value used in the final result.\n"
            f"2. Concept: Compare that code path against the observed issue: {error_context}.\n"
            "3. Question: Which value, condition, or index in that area first differs from what the problem requires?"
        )
    return (
        "1. Exact issue: Check whether the value used in the failing calculation matches the item or state from the same step.\n"
        "2. Pseudocode:\n"
        "for each current item\n"
        "derive the needed value from that current item\n"
        "compare against the stored or expected value\n"
        "return only when both positions or states are valid\n"
        "3. Why it works: This keeps the calculation tied to the same step the answer is based on."
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
    if level == 1:
        return (
            f"1. Error type: {data['bug_type']}\n"
            f"2. Effect: {data['effect']}\n"
            f"3. Question: {data['question']}"
        )
    if level == 2:
        return (
            f"1. Fault area: {data['fault_area']}\n"
            f"2. Concept: {data['concept']}\n"
            f"3. Question: {data['question']}"
        )
    return (
        f"1. Exact issue: {data['exact_issue']}\n"
        f"2. Pseudocode:\n{data['pseudocode']}\n"
        f"3. Why it works: {data['why_it_works']}"
    )
