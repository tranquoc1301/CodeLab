import json
import hashlib
from typing import Any

from upstash_redis.asyncio import Redis

from app.core.config import get_settings

redis_client: Redis | None = None


def get_cache_ttl() -> int:
    settings = get_settings()
    return settings.REDIS_CACHE_TTL


def get_redis() -> Redis:
    """Get or create the Upstash Redis REST client."""
    global redis_client
    if redis_client is None:
        settings = get_settings()
        redis_client = Redis(
            url=settings.UPSTASH_REDIS_REST_URL,
            token=settings.UPSTASH_REDIS_REST_TOKEN,
        )
    return redis_client


def generate_cache_key(prefix: str, params: dict[str, Any]) -> str:
    serialized = json.dumps(params, sort_keys=True)
    hash_val = hashlib.md5(serialized.encode()).hexdigest()[:12]
    return f"{prefix}:{hash_val}"


async def get_cached(key: str) -> dict | None:
    try:
        client = get_redis()
        data = await client.get(key)
        if data:
            return json.loads(data)
    except Exception:
        pass
    return None


async def set_cached(key: str, data: dict, ttl: int | None = None) -> None:
    try:
        client = get_redis()
        cache_ttl = ttl if ttl is not None else get_cache_ttl()
        await client.setex(key, cache_ttl, json.dumps(data))
    except Exception:
        pass


async def invalidate_cache_pattern(prefix: str) -> None:
    """Delete all keys matching a glob pattern (O(n) SCAN)."""
    try:
        client = get_redis()
        cursor = 0
        keys = []
        while True:
            cursor, batch = await client.scan(cursor, match=prefix, count=100)
            keys.extend(batch)
            if cursor == 0:
                break
        if keys:
            await client.delete(*keys)
    except Exception:
        pass


async def delete_cached(key: str) -> None:
    try:
        client = get_redis()
        await client.delete(key)
    except Exception:
        pass


async def close_redis() -> None:
    """No-op for REST client — no persistent connection to close."""
    global redis_client
    redis_client = None
