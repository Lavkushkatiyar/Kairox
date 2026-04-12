# Story 9: Celery Worker Setup & Job Infrastructure

| Field | Details |
|-------|---------|
| **Iteration** | 2 — Intelligence |
| **Story #** | 9 of 24 |
| **Priority** | 🔴 Critical |
| **Depends On** | Story 8 (Redis Setup) |
| **Blocks** | Story 10 (AI Service), Story 11 (Pipeline), Story 14 (Reminder Worker) |
| **Estimated Effort** | 2 days |

---

## User Story

**As a** developer,  
**I want** a Celery worker infrastructure with Redis as the broker,  
**So that** heavy operations (AI calls, reminder scheduling, draft generation) run asynchronously without blocking API responses.

---

## Description

The API must respond instantly to user requests. All heavy lifting happens in background workers:

```
User submits input → API returns immediately → Worker processes asynchronously → Result stored in DB
```

This story sets up Celery with task registration, retry logic, and job status tracking.

---

## Backend Tasks

### 9.1 — Install Dependencies

```
pip install celery[redis]
```

### 9.2 — Celery App Configuration (`workers/celery_app.py`)

```python
from celery import Celery
from app.config import settings

celery_app = Celery("kairox")

celery_app.conf.update(
    broker_url=settings.REDIS_URL,
    result_backend=settings.REDIS_URL,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,           # Acknowledge after completion (reliability)
    worker_prefetch_multiplier=1,   # Fair scheduling
    result_expires=3600,            # Results expire after 1 hour
    task_default_retry_delay=10,    # Default 10s between retries
    task_routes={
        "app.workers.tasks.process_input.*": {"queue": "processing"},
        "app.workers.tasks.reminders.*": {"queue": "reminders"},
        "app.workers.tasks.drafts.*": {"queue": "drafts"},
    },
    beat_schedule={
        # Will be populated in Story 14
    }
)

# Auto-discover tasks
celery_app.autodiscover_tasks(["app.workers.tasks"])
```

### 9.3 — Create Worker Folder Structure

```
backend/app/workers/
├── __init__.py
├── celery_app.py          # Celery configuration
├── base_task.py           # Custom base task class
└── tasks/
    ├── __init__.py
    ├── test_task.py        # Test/smoke task
    ├── process_input.py    # Story 11 — main processing
    ├── reminders.py        # Story 14 — reminder execution
    └── drafts.py           # Story 15 — draft generation
```

### 9.4 — Custom Base Task (`workers/base_task.py`)

```python
from celery import Task
from app.db.session import SessionLocal
import logging

logger = logging.getLogger(__name__)

class KairoxTask(Task):
    """Base task with DB session management and structured logging."""
    
    _db = None

    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        """Cleanup after task completes."""
        if self._db is not None:
            self._db.close()
            self._db = None

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Log failures with context."""
        logger.error(
            f"Task {self.name}[{task_id}] failed: {exc}",
            extra={"task_id": task_id, "args": args}
        )

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Log retries."""
        logger.warning(
            f"Task {self.name}[{task_id}] retrying: {exc}",
            extra={"task_id": task_id, "retry_count": self.request.retries}
        )
```

### 9.5 — Test Task (`workers/tasks/test_task.py`)

```python
from app.workers.celery_app import celery_app
from app.workers.base_task import KairoxTask
import time

@celery_app.task(bind=True, base=KairoxTask, max_retries=3)
def test_task(self, message: str):
    """Simple test task for verifying Celery setup."""
    time.sleep(2)  # Simulate work
    return {"status": "ok", "message": f"Processed: {message}"}

@celery_app.task(bind=True, base=KairoxTask, max_retries=3)
def test_failing_task(self, should_fail: bool = True):
    """Task that fails on first attempt (for testing retries)."""
    if should_fail and self.request.retries == 0:
        raise self.retry(exc=Exception("Simulated failure"), countdown=5)
    return {"status": "ok", "retries": self.request.retries}
```

### 9.6 — Job Status API (`api/v1/jobs.py`)

```python
from fastapi import APIRouter, HTTPException
from app.workers.celery_app import celery_app

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("/{job_id}/status")
def get_job_status(job_id: str):
    """Get the status of an async job."""
    result = celery_app.AsyncResult(job_id)
    
    response = {
        "job_id": job_id,
        "status": result.status,   # PENDING, STARTED, SUCCESS, FAILURE, RETRY
        "ready": result.ready(),
    }
    
    if result.ready():
        if result.successful():
            response["result"] = result.result
        else:
            response["error"] = str(result.result)
    
    return response

@router.post("/test")
def trigger_test_job(message: str = "Hello Kairox"):
    """Trigger a test job for verifying worker setup."""
    from app.workers.tasks.test_task import test_task
    result = test_task.delay(message)
    return {"job_id": result.id, "status": "queued"}
```

### 9.7 — Worker Start Command

```bash
# Start worker (all queues)
celery -A app.workers.celery_app worker --loglevel=info

# Start worker (specific queue)
celery -A app.workers.celery_app worker --loglevel=info -Q processing

# Start Celery Beat (scheduler — for Story 14)
celery -A app.workers.celery_app beat --loglevel=info
```

Add to `package.json` or `Makefile`:
```makefile
worker:
	celery -A app.workers.celery_app worker --loglevel=info --pool=solo

beat:
	celery -A app.workers.celery_app beat --loglevel=info
```

---

## Frontend Tasks

### 9.8 — Job Polling Hook (`hooks/useJobPolling.js`)

```javascript
import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

function useJobPolling(jobId, options = {}) {
  const { interval = 2000, onComplete, onError } = options;
  const [status, setStatus] = useState('pending');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const response = await api.get(`/api/v1/jobs/${jobId}/status`);
        const data = response.data;
        setStatus(data.status);

        if (data.ready) {
          clearInterval(timerRef.current);
          if (data.result) {
            setResult(data.result);
            onComplete?.(data.result);
          }
          if (data.error) {
            setError(data.error);
            onError?.(data.error);
          }
        }
      } catch (err) {
        clearInterval(timerRef.current);
        setError(err.message);
      }
    };

    timerRef.current = setInterval(poll, interval);
    poll(); // Initial check

    return () => clearInterval(timerRef.current);
  }, [jobId]);

  return { status, result, error, isProcessing: !['SUCCESS', 'FAILURE'].includes(status) };
}

export default useJobPolling;
```

### 9.9 — Processing Indicator Component

- Show job status transitions: `Queued → Started → Processing → Done`
- Animated spinner while processing
- Green checkmark on success
- Red X with error message on failure

---

## Acceptance Criteria

- [ ] Celery worker starts and connects to Redis broker
- [ ] `POST /api/v1/jobs/test` queues a test task
- [ ] `GET /api/v1/jobs/{id}/status` returns correct status (PENDING → STARTED → SUCCESS)
- [ ] Failed tasks retry up to 3 times
- [ ] DB sessions are properly cleaned up after task completion
- [ ] Frontend polling hook tracks job status correctly
- [ ] Worker logs are structured and informative

---

## Notes

- We use `--pool=solo` on Windows for development. Linux will use `prefork`.
- `task_acks_late=True` ensures tasks aren't lost if a worker crashes mid-processing.
- Three separate queues (processing, reminders, drafts) allow independent scaling.
- Story 11 will create the main `process_input` task that does the real work.
