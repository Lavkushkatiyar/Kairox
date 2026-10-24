import asyncio

import pytest

from app.cache.redis_client import close_redis, init_redis
from app.cache.utils import delete_cache, delete_cache_pattern, get_cache, set_cache


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


@pytest.mark.asyncio
async def test_delete_cache_pattern():
    await init_redis()
    key1 = "testkey1"
    key2 = "testkey2"
    await set_cache(key1, "value1", 60)
    await set_cache(key2, "value2", 60)
    await set_cache("user:1", {"id": 1}, 60)

    await delete_cache_pattern("testkey*")
    result1 = await get_cache(key1)
    result2 = await get_cache(key2)
    assert result1 is None
    assert result2 is None
    assert await get_cache("user:1") == {"id": 1}
    await close_redis()


@pytest.mark.asyncio
async def test_concurrent_cache_operations():
    await init_redis()
    operations = []
    for i in range(10):
        operations.append(set_cache(f"testkey{i}", f"value{i}", 60))
    await asyncio.gather(*operations)

    operations_get = []
    for i in range(10):
        operations_get.append(get_cache(f"testkey{i}"))
    results = await asyncio.gather(*operations_get)

    expected = [f"value{i}" for i in range(10)]
    assert results == expected
    await close_redis()
