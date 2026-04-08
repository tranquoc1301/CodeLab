import json
import hashlib
from typing import Any

import redis.asyncio as redis

from app.core.config import get_settings

redis_client: redis.Redis | None = None


def get_cache_ttl() -> int:
    """Get the cache TTL from settings."""
    settings = get_settings()
    return settings.REDIS_CACHE_TTL


async def get_redis() -> redis.Redis:
    """Get or create the Redis connection."""
    global redis_client
    if redis_client is None:
        settings = get_settings()
        # Support password in REDIS_URL (e.g., redis://:password@host:port)
        redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
        )
    return redis_client


def generate_cache_key(prefix: str, params: dict[str, Any]) -> str:
    """Generate a deterministic cache key from parameters."""
    serialized = json.dumps(params, sort_keys=True)
    hash_val = hashlib.md5(serialized.encode()).hexdigest()[:12]
    return f"{prefix}:{hash_val}"


async def get_cached(key: str) -> dict | None:
    """Retrieve and deserialize a cached value."""
    try:
        client = await get_redis()
        data = await client.get(key)
        if data:
            return json.loads(data)
    except Exception:
        pass
    return None


async def set_cached(key: str, data: dict, ttl: int | None = None) -> None:
    """Serialize and store a value in the cache with TTL."""
    try:
        client = await get_redis()
        cache_ttl = ttl if ttl is not None else get_cache_ttl()
        await client.setex(key, cache_ttl, json.dumps(data))
    except Exception:
        pass


async def invalidate_cache(pattern: str) -> None:
    """Delete all cached keys matching a glob pattern."""
    try:
        client = await get_redis()
        keys = []
        async for key in client.scan_iter(match=pattern):
            keys.append(key)
        if keys:
            await client.delete(*keys)
    except Exception:
        pass


async def close_redis() -> None:
    """Close the Redis connection."""
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None
