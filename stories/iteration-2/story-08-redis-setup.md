# Story 8: Redis Setup & Configuration

| Field | Details |
|-------|---------|
| **Iteration** | 2 — Intelligence |
| **Story #** | 8 of 24 |
| **Priority** | 🔴 Critical |
| **Depends On** | Story 1 (Scaffolding) |
| **Blocks** | Story 9 (Celery), Story 16 (Caching), Story 17 (WebSocket) |
| **Estimated Effort** | 1 day |

---

## User Story

**As a** developer,  
**I want** Redis integrated into the backend,  
**So that** we have a fast in-memory layer for job queues, caching, pub/sub, and temporary state.

---

## Description

Redis is the **backbone of all async operations** in Kairox. It powers:
- **Job queue** → Celery broker (Story 9)
- **Data caching** → fast reads (Story 16)
- **Pub/Sub** → real-time WebSocket events (Story 17)
- **Temporary state** → processing progress (Story 18)

This story sets up the Redis client, connection pool, health checks, and utility helpers.

---

## Backend Tasks

### 8.1 — Install Dependencies

```
pip install redis aioredis
```

### 8.2 — Redis Client (`cache/redis_client.py`)

```python
import redis.asyncio as aioredis
import redis
import json
from app.config import settings

# Async client (for FastAPI endpoints)
async_redis = None

# Sync client (for Celery workers)  
sync_redis = None

async def init_redis():
    global async_redis
    async_redis = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
        max_connections=20
    )
    return async_redis

async def close_redis():
    global async_redis
    if async_redis:
        await async_redis.close()

def get_sync_redis():
    global sync_redis
    if sync_redis is None:
        sync_redis = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
    return sync_redis

async def get_redis():
    return async_redis
```

### 8.3 — Cache Utilities (`cache/utils.py`)

```python
import json
from typing import Any, Optional
from app.cache.redis_client import get_redis

async def cache_set(key: str, value: Any, ttl: int = 300):
    r = await get_redis()
    await r.setex(key, ttl, json.dumps(value, default=str))

async def cache_get(key: str) -> Optional[Any]:
    r = await get_redis()
    data = await r.get(key)
    return json.loads(data) if data else None

async def cache_delete(key: str):
    r = await get_redis()
    await r.delete(key)

async def cache_delete_pattern(pattern: str):
    r = await get_redis()
    keys = []
    async for key in r.scan_iter(match=pattern):
        keys.append(key)
    if keys:
        await r.delete(*keys)
```

### 8.4 — Key Naming Convention (`cache/keys.py`)

```python
def user_tasks_key(user_id: str) -> str:
    return f"user:{user_id}:tasks"

def user_reminders_key(user_id: str) -> str:
    return f"user:{user_id}:reminders"

def input_status_key(input_id: str) -> str:
    return f"input:{input_id}:status"

def input_progress_key(input_id: str) -> str:
    return f"input:{input_id}:progress"

def job_result_key(job_id: str) -> str:
    return f"job:{job_id}:result"

def task_dependencies_key(task_id: str) -> str:
    return f"task:{task_id}:deps"

def dashboard_stats_key(user_id: str) -> str:
    return f"user:{user_id}:dashboard"
```

### 8.5 — FastAPI Lifespan Integration

Update `main.py`:
```python
from app.cache.redis_client import init_redis, close_redis

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
    print("✅ Redis connected")
    yield
    await close_redis()
    print("❌ Redis disconnected")
```

### 8.6 — Health Check Update

```python
@app.get("/health")
async def health_check():
    redis_ok = False
    try:
        r = await get_redis()
        await r.ping()
        redis_ok = True
    except:
        pass
    
    return {
        "status": "ok" if redis_ok else "degraded",
        "services": {
            "api": True,
            "redis": redis_ok,
        }
    }
```

### 8.7 — Docker Compose Update

Add Redis to `docker-compose.dev.yml`:
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

---

## Frontend Tasks

### 8.8 — Health Check Update

Update health check page to show Redis status from `/health` response.

---

## Acceptance Criteria

- [ ] Redis container starts via Docker Compose
- [ ] FastAPI connects to Redis on startup
- [ ] `/health` reports Redis status
- [ ] `cache_set` / `cache_get` / `cache_delete` work correctly
- [ ] Key naming convention is consistent
- [ ] Connection pool handles concurrent requests

---

## Notes

- We use `redis.asyncio` for FastAPI (async) and regular `redis` for Celery workers (sync).
- Default TTL of 300s (5 minutes) — can be overridden per call.
- `cache_delete_pattern` uses SCAN (not KEYS) for production safety.
