# Story 18: Input Processing Status Tracking

| Field | Details |
|-------|---------|
| **Iteration** | 3 — Automation |
| **Story #** | 18 of 24 |
| **Priority** | 🟢 Medium |
| **Depends On** | Story 11 (Pipeline), Story 17 (WebSocket) |
| **Estimated Effort** | 1–2 days |

---

## User Story

**As a** user,  
**I want** to see step-by-step processing progress,  
**So that** I know exactly what the system is doing with my input.

---

## Description

Show granular progress updates during the processing pipeline. Store progress in Redis (ephemeral) and push via WebSocket.

---

## Backend Tasks

### 18.1 — Granular Progress Steps

Define processing steps:
```python
PROCESSING_STEPS = [
    {"step": 1, "name": "analyzing", "message": "Analyzing your input..."},
    {"step": 2, "name": "extracting_tasks", "message": "Extracting tasks..."},
    {"step": 3, "name": "resolving_time", "message": "Resolving time references..."},
    {"step": 4, "name": "resolving_deps", "message": "Building dependency chain..."},
    {"step": 5, "name": "generating_drafts", "message": "Generating drafts..."},
    {"step": 6, "name": "saving", "message": "Saving everything..."},
    {"step": 7, "name": "completed", "message": "Done! ✅"},
]
```

### 18.2 — Update Pipeline to Emit Progress

In `process_input` worker, after each step:
```python
def _update_progress(input_id, step, total=7):
    redis = get_sync_redis()
    redis.hset(f"input:{input_id}:progress", mapping={
        "current_step": step["name"],
        "step_number": step["step"],
        "total_steps": total,
        "message": step["message"],
    })
    redis.expire(f"input:{input_id}:progress", 300)
    
    # Push via WebSocket
    redis.publish(f"user:{user_id}", json.dumps({
        "event": "input.progress",
        "data": {
            "input_id": str(input_id),
            "step": step["step"],
            "total": total,
            "message": step["message"]
        }
    }))
```

### 18.3 — Progress API Fallback

```python
@router.get("/{input_id}/progress")
def get_progress(input_id: UUID, current_user, db):
    """Fallback for clients without WebSocket."""
    redis = get_sync_redis()
    progress = redis.hgetall(f"input:{input_id}:progress")
    if not progress:
        return {"step": 0, "message": "Waiting in queue..."}
    return progress
```

---

## Frontend Tasks

### 18.4 — Processing Stepper Component

**Design:**
- Multi-step progress bar (horizontal or vertical)
- Steps: Analyzing → Extracting → Scheduling → Linking → Drafts → Saving → Done
- Current step: highlighted with pulse animation
- Completed steps: checkmark icon
- Upcoming steps: grayed out
- Estimated time remaining (based on step timing)

### 18.5 — Wire to WebSocket

- Listen for `input.progress` events
- Update stepper in real time
- On `completed` event, transition to results view with smooth animation

---

## Acceptance Criteria

- [ ] Progress updates appear in real time (via WebSocket)
- [ ] Each processing step is visually distinct in the UI
- [ ] Fallback API works for polling clients
- [ ] Progress data auto-expires in Redis after 5 minutes
