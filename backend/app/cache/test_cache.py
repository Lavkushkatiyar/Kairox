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
    
@pytest.mark.asyncio    
async def test_delete_cache():
    await init_redis()
    key = "testkey"
    await set_cache(key, "value", 60)
    await delete_cache(key)
    result = await get_cache(key)
    assert result is None
    await close_redis()
    
@pytest.mark.asyncio
async def test_ttl_cache():
    await init_redis()
    key = "testkey"
    await set_cache(key, "value", 1)
    await asyncio.sleep(2)
    result = await get_cache(key)
    assert result is None
    await close_redis()