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
                json={
                    "model": settings.LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    "max_tokens": max_tokens,
                    "temperature": temperature,
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
            return ""
    except httpx.TimeoutException:
        logger.warning("LLM request timed out")
        return ""
    except httpx.HTTPStatusError as exc:
        logger.error("LLM HTTP error: %s", exc.response.status_code)
        return ""
    except Exception:
        logger.exception("Unexpected error calling LLM")
        return ""
