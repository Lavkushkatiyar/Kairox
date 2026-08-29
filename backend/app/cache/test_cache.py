import pytest
import asyncio
from app.cache.redis_client import init_redis, close_redis,get_redis
from app.cache.utils import set_cache, get_cache, delete_cache

@pytest.mark.asyncio 
async def test_set_and_get_cache():
    await init_redis()
    key = "testkey"
    value = {"name": "John", "age": 30}
    ttl = 60
    await set_cache(key, value, ttl)
    result = await get_cache(key)
    assert result == value
    await close_redis()