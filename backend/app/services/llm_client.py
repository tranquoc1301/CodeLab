import json
import logging

import httpx


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
        logger.warning("LLM_API_KEY not configured, returning empty response")
        return ""

    try:
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT) as client:
            response = await client.post(
                f"{settings.LLM_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.LLM_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=_build_request_payload(
                    model=settings.LLM_MODEL,
                    system_prompt=system_prompt,
                    user_content=user_content,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    response_schema=response_schema,
                ),
            )
            response.raise_for_status()
            return _extract_response_content(response.json())
    except httpx.TimeoutException:
        logger.warning("LLM request timed out")
        return ""
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        body = ""
        try:
            body = exc.response.json().get("error", {}).get("message", "")
        except Exception:
            pass
        logger.error("LLM HTTP error: %s body=%s", status, body)
        return ""
    except Exception:
        logger.exception("Unexpected error calling LLM")
        return ""


def _build_request_payload(
    *,
    model: str,
    system_prompt: str,
    user_content: str,
    max_tokens: int,
    temperature: float,
    response_schema: dict | None,
) -> dict:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
        "response_format": _build_response_format(response_schema),
    }
    if response_schema:
        payload["plugins"] = [{"id": "response-healing"}]
    return payload


def _build_response_format(response_schema: dict | None) -> dict:
    if not response_schema:
        return {"type": "json_object"}
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "hint_response",
            "strict": True,
            "schema": response_schema,
        },
    }


def _extract_response_content(data: dict) -> str:
    choices = data.get("choices", [])
    if not choices:
        logger.warning("LLM returned empty choices")
        return ""

    message = choices[0].get("message", {})
    parsed = message.get("parsed")
    if isinstance(parsed, dict):
        return json.dumps(parsed, ensure_ascii=False)

    content = message.get("content", "")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        text_parts = [
            part.get("text", "")
            for part in content
            if isinstance(part, dict) and isinstance(part.get("text"), str)
        ]
        return "".join(text_parts).strip()

    logger.warning("LLM returned unsupported content format")
    return ""
