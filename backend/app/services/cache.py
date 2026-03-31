import os
import json
import hashlib
from typing import Any
import redis.asyncio as redis

redis_client: redis.Redis | None = None
CACHE_TTL = int(os.getenv("REDIS_CACHE_TTL", "60"))


async def get_redis() -> redis.Redis:
    global redis_client
    if redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        redis_client = redis.from_url(redis_url, decode_responses=True)
    return redis_client


def generate_cache_key(prefix: str, params: dict[str, Any]) -> str:
    serialized = json.dumps(params, sort_keys=True)
    hash_val = hashlib.md5(serialized.encode()).hexdigest()[:12]
    return f"{prefix}:{hash_val}"


async def get_cached(key: str) -> dict | None:
    try:
        client = await get_redis()
        data = await client.get(key)
        if data:
            return json.loads(data)
    except Exception:
        pass
    return None


async def set_cached(key: str, data: dict, ttl: int = CACHE_TTL) -> None:
    try:
        client = await get_redis()
        await client.setex(key, ttl, json.dumps(data))
    except Exception:
        pass


async def invalidate_cache(pattern: str) -> None:
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
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None