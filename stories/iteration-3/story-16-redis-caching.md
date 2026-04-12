# Story 16: Redis Caching Layer

| Field | Details |
|-------|---------|
| **Iteration** | 3 — Automation |
| **Story #** | 16 of 24 |
| **Priority** | 🟢 Medium |
| **Depends On** | Story 8 (Redis Setup) |
| **Estimated Effort** | 1–2 days |

---

## User Story

**As a** developer,  
**I want** frequently accessed data cached in Redis,  
**So that** API responses are fast and database load is reduced.

---

## Description

Implement cache-aside pattern for key endpoints. When data is requested, check Redis first. On cache miss, query DB, cache the result, and return. Invalidate cache when data changes.

---

## Backend Tasks

### 16.1 — `@cached` Decorator

```python
def cached(key_func, ttl=300):
    """Cache-aside decorator for service methods."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = key_func(*args, **kwargs)
            data = await cache_get(key)
            if data is not None:
                # Add cache header for debugging
                return data  # HIT
            result = await func(*args, **kwargs)
            await cache_set(key, result, ttl)
            return result  # MISS
        return wrapper
    return decorator
```

### 16.2 — Apply to Key Endpoints

| Endpoint | Cache Key | TTL |
|----------|-----------|-----|
| `GET /tasks` | `user:{id}:tasks:{hash(filters)}` | 5 min |
| `GET /tasks/{id}/dependencies/chain` | `task:{id}:deps` | 10 min |
| `GET /reminders?upcoming_only=true` | `user:{id}:reminders` | 2 min |
| `GET /dashboard/stats` | `user:{id}:dashboard` | 5 min |
| `GET /timeline` | `user:{id}:timeline:{date_range}` | 5 min |

### 16.3 — Cache Invalidation

On task create/update/delete:
```python
await cache_delete_pattern(f"user:{user_id}:tasks:*")
await cache_delete(f"user:{user_id}:dashboard")
await cache_delete_pattern(f"user:{user_id}:timeline:*")
```

On dependency change:
```python
await cache_delete(f"task:{task_id}:deps")
```

### 16.4 — `X-Cache` Response Header

Add middleware to set `X-Cache: HIT` or `X-Cache: MISS` for debugging.

---

## Acceptance Criteria

- [ ] Repeated requests return cached data significantly faster
- [ ] Cache invalidation prevents stale data
- [ ] `X-Cache` header correctly reports HIT/MISS
- [ ] Cache expiry works (data refreshes after TTL)
