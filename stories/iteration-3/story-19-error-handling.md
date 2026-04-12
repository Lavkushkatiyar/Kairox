# Story 19: Error Handling & Retry System

| Field | Details |
|-------|---------|
| **Iteration** | 3 — Automation |
| **Story #** | 19 of 24 |
| **Priority** | 🟡 High |
| **Depends On** | Story 11 (Pipeline) |
| **Estimated Effort** | 2 days |

---

## User Story

**As a** developer,  
**I want** robust error handling and automatic retry logic,  
**So that** transient failures don't lose user data and errors are clear and actionable.

---

## Description

Production systems fail. APIs timeout, databases hiccup, AI services throttle. This story ensures Kairox handles failures gracefully with retries, clear error messages, and recovery paths.

---

## Backend Tasks

### 19.1 — Custom Exception Classes (`utils/exceptions.py`)

```python
class KairoxError(Exception):
    """Base exception for all Kairox errors."""
    status_code = 500
    detail = "An internal error occurred"

class AIServiceError(KairoxError):
    status_code = 502
    detail = "AI service is temporarily unavailable"

class ProcessingError(KairoxError):
    status_code = 500
    detail = "Failed to process input"

class ValidationError(KairoxError):
    status_code = 422
    detail = "Input validation failed"

class DependencyCycleError(KairoxError):
    status_code = 400
    detail = "Circular dependency detected"

class ResourceNotFoundError(KairoxError):
    status_code = 404
    detail = "Resource not found"

class RateLimitError(KairoxError):
    status_code = 429
    detail = "Too many requests"
```

### 19.2 — Global Exception Handler

```python
@app.exception_handler(KairoxError)
async def kairox_error_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.__class__.__name__,
            "detail": exc.detail,
            "message": str(exc),
        }
    )

@app.exception_handler(Exception)
async def global_error_handler(request, exc):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "detail": "An unexpected error occurred",
        }
    )
```

### 19.3 — Celery Retry Strategies

| Task Type | Max Retries | Backoff | Retry On |
|-----------|-------------|---------|----------|
| AI API calls | 3 | Exponential (10s, 30s, 90s) | `APIError`, `RateLimitError`, `Timeout` |
| DB operations | 5 | Fixed (5s) | `OperationalError`, `DisconnectionError` |
| Draft generation | 3 | Exponential (10s, 30s, 90s) | `APIError` |
| Reminder sending | 3 | Fixed (10s) | Any exception |

### 19.4 — Failed Job Recovery

```python
@router.get("/admin/failed-jobs")
def list_failed_jobs(current_user, db):
    """List inputs with failed status."""
    failed = db.query(RawInput).filter(RawInput.status == InputStatus.FAILED).all()
    return {"failed_jobs": failed}

@router.post("/inputs/{input_id}/retry")
def retry_failed_input(input_id: UUID, current_user, db):
    """Retry processing a failed input."""
    raw_input = InputService.get_input(db, current_user.id, input_id)
    if raw_input.status != InputStatus.FAILED:
        raise HTTPException(400, "Only failed inputs can be retried")
    
    raw_input.status = InputStatus.PENDING
    raw_input.error_message = None
    db.commit()
    
    process_input.delay(str(input_id))
    return {"message": "Requeued for processing"}
```

### 19.5 — Structured Logging

```python
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "correlation_id": getattr(record, "correlation_id", None),
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)
```

### 19.6 — Add `error_message` to Raw Input

Migration (if not done in Story 3):
```python
error_message = Column(Text, nullable=True)
```

---

## Frontend Tasks

### 19.7 — Error Banner Component

- Red/orange banner at top of page for critical errors
- Clear error message with suggested action
- "Retry" button for failed inputs
- Auto-dismiss for transient errors

### 19.8 — React Error Boundary

```javascript
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    render() {
        if (this.state.hasError) {
            return <ErrorFallback error={this.state.error} />;
        }
        return this.props.children;
    }
}
```

### 19.9 — Error Toast Notifications

- For API errors: show brief toast with error message
- For network errors: "Connection lost. Retrying..."
- For 429 (rate limit): "Please wait a moment before trying again"

---

## Acceptance Criteria

- [ ] All API errors return structured JSON responses
- [ ] AI API failures trigger automatic retries with backoff
- [ ] Failed inputs have clear error messages
- [ ] Users can manually retry failed inputs
- [ ] Frontend shows error banners and retry buttons
- [ ] Error boundary catches React rendering errors
- [ ] Structured logs include correlation IDs
