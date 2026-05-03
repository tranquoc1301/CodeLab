"""LLM hint service for generating progressive hints for submissions."""

import logging

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.submission_hint import SubmissionHint
from app.services.error_classifier import classify_verdict
from app.services.llm_hint_prompts import (
    ERROR_CONTEXT_MAP,
    FALLBACK_MESSAGE,
    HINT_LEVEL_INSTRUCTIONS,
    build_full_prompt,
)

logger = logging.getLogger(__name__)


async def request_next_hint(
    db: AsyncSession,
    user_id: int,
    problem_id: int,
    verdict: dict,
    topic_slugs: list[str],
    source_code: str = "",
    problem_description: str = "",
) -> dict:
    """Request the next hint level for a user on a problem.
    
    Fetches or creates a SubmissionHint row, returns cached hints if available,
    or generates a new hint using the LLM.
    
    Returns:
        dict with keys: hint (str|None), hint_level (int), exhausted (bool)
    """
    logger.info(f"request_next_hint called: user={user_id}, problem={problem_id}")
    
    # Step 1: Fetch or create SubmissionHint row
    stmt = select(SubmissionHint).where(
        SubmissionHint.user_id == user_id,
        SubmissionHint.problem_id == problem_id,
    )
    result = await db.execute(stmt)
    hint_row = result.scalar_one_or_none()
    
    if hint_row is None:
        logger.info(f"No existing hint row found. Creating new hint row for user={user_id}, problem={problem_id}")
        hint_row = SubmissionHint(
            user_id=user_id,
            problem_id=problem_id,
            current_level=0,
        )
        db.add(hint_row)
        await db.flush()
        await db.commit()
        # Re-fetch to ensure we have a fresh instance in the session
        stmt = select(SubmissionHint).where(
            SubmissionHint.user_id == user_id,
            SubmissionHint.problem_id == problem_id,
        )
        result = await db.execute(stmt)
        hint_row = result.scalar_one()
        logger.info(f"Created hint row with id={hint_row.id}, current_level={hint_row.current_level}")
    else:
        logger.info(f"Found existing hint row id={hint_row.id}, current_level={hint_row.current_level}")
    
    # Step 2: Check if exhausted
    if hint_row.current_level >= 3:
        logger.info(f"Hints exhausted for user={user_id}, problem={problem_id}")
        return {"hint": None, "hint_level": 3, "exhausted": True}
    
    # Step 3: Determine next level
    next_level = hint_row.current_level + 1
    logger.info(f"Next level will be: {next_level}")
    
    # Step 4: Check for cached hint
    cached_hint = getattr(hint_row, f"hint_{next_level}", None)
    if cached_hint:
        logger.info(f"Returning cached hint_{next_level} for user={user_id}, problem={problem_id}")
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
    prompt = _build_prompt(
        next_level=next_level,
        error_context=error_context,
        verdict=verdict,
        source_code=source_code,
        problem_description=problem_description,
    )
    
    settings = get_settings()
    hint_text = await _call_llm(prompt, settings)
    
    # Step 8: Save to database
    logger.info(f"Saving hint_{next_level} for user={user_id}, problem={problem_id}. Hint length: {len(hint_text) if hint_text else 0}")
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


async def reset_hint_progress(
    db: AsyncSession,
    user_id: int,
    problem_id: int,
) -> None:
    """Reset hint progress for a user on a problem (e.g., after Accepted submission).
    
    Finds the SubmissionHint row and resets all progress fields.
    """
    stmt = select(SubmissionHint).where(
        SubmissionHint.user_id == user_id,
        SubmissionHint.problem_id == problem_id,
    )
    result = await db.execute(stmt)
    hint_row = result.scalar_one_or_none()
    
    if hint_row is not None:
        hint_row.current_level = 0
        hint_row.hint_1 = None
        hint_row.hint_2 = None
        hint_row.hint_3 = None
        hint_row.last_error_label = None
        await db.commit()


def _build_prompt(
    next_level: int,
    error_context: str,
    verdict: dict,
    source_code: str,
    problem_description: str,
    language: str = "python",
) -> str:
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
    )


async def _call_llm(prompt: str, settings) -> str:
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
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 400,
                    "temperature": 0.3,
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
