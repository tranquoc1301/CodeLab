import json
import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def call_llm_json(
    *,
    system_prompt: str,
    user_content: str,
    settings,
    max_tokens: int,
    temperature: float = 0.1,
    response_schema: dict | None = None,
) -> str:
    if not settings.LLM_API_KEY:
        logger.warning("Gemini API key not configured, returning empty response")
        return ""

    model = settings.LLM_MODEL
    url = f"{settings.LLM_BASE_URL}/models/{model}:generateContent"

    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": user_content}]}
        ],
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "responseMimeType": "application/json",
        },
    }

    schema = _build_response_schema(response_schema)
    if schema:
        payload["generationConfig"]["responseSchema"] = schema

    try:
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT) as client:
            response = await client.post(
                url,
                params={"key": settings.LLM_API_KEY},
                headers={"Content-Type": "application/json"},
                json=payload,
            )
            response.raise_for_status()
            return _extract_response_content(response.json())
    except httpx.TimeoutException:
        logger.warning("Gemini request timed out")
        return ""
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        body = ""
        try:
            body = exc.response.json().get("error", {}).get("message", "")
        except Exception:
            pass
        logger.error("Gemini HTTP error: %s body=%s", status, body)
        return ""
    except Exception:
        logger.exception("Unexpected error calling Gemini")
        return ""


def _build_response_schema(response_schema: dict | None) -> dict | None:
    if not response_schema:
        return None

    properties = response_schema.get("properties")
    if not properties:
        return None

    required = response_schema.get("required", [])

    return {
        "type": "object",
        "properties": properties,
        "required": required,
    }


def _extract_response_content(data: dict) -> str:
    candidates = data.get("candidates", [])
    if not candidates:
        logger.warning("Gemini returned empty candidates")
        return ""

    candidate = candidates[0]
    content = candidate.get("content", {})
    parts = content.get("parts", [])

    text_parts = []
    for part in parts:
        if isinstance(part, dict) and isinstance(part.get("text"), str):
            text_parts.append(part["text"])

    joined = "".join(text_parts).strip()
    if not joined:
        logger.warning("Gemini returned empty text")
    return joined
