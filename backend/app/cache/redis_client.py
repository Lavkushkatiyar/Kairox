import redis.asyncio as redis
from app.config import settings

async_redis = None

async def init_redis(   ):
    global async_redis
    async_redis = redis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )

async def get_redis():
    return async_redis

async def close_redis():
    global async_redis
    
    if async_redis is not None:
        await async_redis.aclose()
        async_redis = None
    