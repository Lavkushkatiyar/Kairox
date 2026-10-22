import json

from app.cache.redis_client import get_redis


async def get_cache(key: str):
    redis = await get_redis()
    result = await redis.get(key)
    if result:
        return json.loads(result)
    return None


async def set_cache(key: str, value, ttl: int = None):
    redis = await get_redis()
    if ttl:
        await redis.set(key, json.dumps(value), ex=ttl)
    else:
        await redis.set(key, json.dumps(value))


async def delete_cache(key: str):
    redis = await get_redis()
    await redis.delete(key)


async def delete_cache_pattern(pattern: str):
    redis = await get_redis()
    keys = []
    async for key in redis.scan_iter(match=pattern):
        keys.append(key)
    if keys:
        await redis.delete(*keys)
