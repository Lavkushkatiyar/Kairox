# Story 11: Input Processing Pipeline (The Core Flow) ★

| Field | Details |
|-------|---------|
| **Iteration** | 2 — Intelligence |
| **Story #** | 11 of 24 |
| **Priority** | 🔴 **CRITICAL — KEYSTONE** |
| **Depends On** | Story 3 (Input), Story 4 (Tasks), Story 9 (Celery), Story 10 (AI) |
| **Blocks** | Story 12 (Time), Story 13 (Deps), Story 18 (Progress), Story 19 (Errors) |
| **Estimated Effort** | 3–5 days |

---

## User Story

**As a** user,  
**I want** my submitted text to be automatically processed into structured tasks, drafts, and reminders,  
**So that** I don't have to manually decompose my thoughts into actionable items.

---

## Description

> ⚠️ **This is the most important story in the entire project.** It connects Inputs, AI, Tasks, Drafts, Dependencies, and Reminders into a single automated pipeline.

**The flow:**
```
User submits text
    ↓
API stores RawInput (status: pending)
    ↓
Celery task dispatched to Redis queue
    ↓
Worker picks up job
    ↓
Step 1: Fetch raw input from DB
Step 2: Update status to "processing"
Step 3: Call AIService.parse_input(text)
Step 4: Normalize & validate parsed output
Step 5: Resolve time references → datetimes
Step 6: Create Task records in DB
Step 7: Resolve dependencies between tasks
Step 8: Create Draft records for communication tasks
Step 9: Auto-create reminders for tasks with due dates
Step 10: Update RawInput status to "completed"
Step 11: Cache result in Redis
Step 12: Publish WebSocket event (if Story 17 is done)
    ↓
User sees structured tasks
```

---

## Backend Tasks

### 11.1 — Main Processing Task (`workers/tasks/process_input.py`)

```python
from app.workers.celery_app import celery_app
from app.workers.base_task import KairoxTask
from app.db.session import SessionLocal
from app.models.raw_input import RawInput, InputStatus
from app.models.task import Task, TaskStatus, TaskPriority, TaskType
from app.models.draft import Draft, DraftType, DraftStatus, DraftTone
from app.models.task_dependency import TaskDependency
from app.services.ai_service import get_ai_service
from app.services.time_resolver import TimeResolver
from app.services.reminder_service import ReminderService
import logging
from uuid import UUID
from datetime import datetime

logger = logging.getLogger(__name__)

@celery_app.task(
    bind=True, 
    base=KairoxTask, 
    max_retries=3,
    default_retry_delay=10,
    acks_late=True,
    name="process_input"
)
def process_input(self, input_id: str):
    """
    The CORE pipeline: process a raw text input into structured tasks.
    
    Steps:
    1. Fetch raw input
    2. Update status to processing
    3. Call AI to parse input
    4. Validate & normalize output
    5. Resolve time expressions
    6. Create tasks in DB
    7. Resolve & create dependencies
    8. Create drafts
    9. Auto-create reminders
    10. Update status to completed
    """
    db = self.db
    input_uuid = UUID(input_id)
    
    try:
        # -- Step 1: Fetch raw input --
        raw_input = db.query(RawInput).filter(RawInput.id == input_uuid).first()
        if not raw_input:
            logger.error(f"Input {input_id} not found")
            return {"error": "Input not found"}
        
        user_id = raw_input.user_id
        
        # -- Step 2: Update status to processing --
        raw_input.status = InputStatus.PROCESSING
        db.commit()
        
        # -- Step 3: Call AI --
        ai_service = get_ai_service()
        parsed = ai_service.parse_input(raw_input.text)
        logger.info(
            f"AI extracted {len(parsed.tasks)} tasks, "
            f"{len(parsed.drafts)} drafts from input {input_id}"
        )
        
        # -- Step 4: Validate & normalize --
        validated_tasks = _validate_tasks(parsed.tasks)
        
        # -- Step 5: Resolve time references --
        user = db.query(User).filter(User.id == user_id).first()
        timezone = user.timezone if user else "UTC"
        time_resolver = TimeResolver(timezone=timezone)
        
        for task_data in validated_tasks:
            if task_data.due_expression:
                task_data.resolved_due_at = time_resolver.resolve(
                    task_data.due_expression
                )
        
        # -- Step 6: Create tasks in DB --
        created_tasks = []
        title_to_task = {}  # For dependency resolution
        
        for i, task_data in enumerate(validated_tasks):
            task = Task(
                user_id=user_id,
                input_id=input_uuid,
                title=task_data.title,
                description=task_data.description,
                status=TaskStatus.TODO,
                priority=_map_priority(task_data.priority),
                task_type=_map_type(task_data.task_type),
                due_at=getattr(task_data, 'resolved_due_at', None),
                sort_order=i,
                ai_generated=True,
                ai_confidence=parsed.confidence,
            )
            db.add(task)
            db.flush()  # Get ID without commit
            created_tasks.append(task)
            title_to_task[task_data.title.lower()] = task
        
        # -- Step 7: Resolve dependencies --
        for task_data, task in zip(validated_tasks, created_tasks):
            for dep_title in task_data.depends_on_titles:
                dep_task = _find_matching_task(
                    dep_title, title_to_task
                )
                if dep_task and dep_task.id != task.id:
                    dep = TaskDependency(
                        task_id=task.id,
                        depends_on_id=dep_task.id
                    )
                    db.add(dep)
        
        # -- Step 8: Create drafts --
        created_drafts = []
        for draft_data in parsed.drafts:
            # Find related task
            related_task = None
            if draft_data.related_task_title:
                related_task = _find_matching_task(
                    draft_data.related_task_title, title_to_task
                )
            
            draft = Draft(
                user_id=user_id,
                input_id=input_uuid,
                task_id=related_task.id if related_task else None,
                content=draft_data.content,
                original_content=draft_data.content,
                draft_type=_map_draft_type(draft_data.draft_type),
                tone=DraftTone.FORMAL,
                recipient=draft_data.recipient,
                subject=draft_data.subject,
                status=DraftStatus.GENERATED,
            )
            db.add(draft)
            created_drafts.append(draft)
        
        # -- Step 9: Auto-create reminders --
        for task in created_tasks:
            if task.due_at:
                ReminderService.auto_create_reminder(
                    db, user_id, task.id, minutes_before=30
                )
        
        # -- Step 10: Update status --
        raw_input.status = InputStatus.COMPLETED
        raw_input.processed_at = datetime.utcnow()
        
        # Commit everything in one transaction
        db.commit()
        
        result = {
            "input_id": input_id,
            "tasks_created": len(created_tasks),
            "drafts_created": len(created_drafts),
            "interpretation": parsed.interpretation,
            "confidence": parsed.confidence,
        }
        
        logger.info(f"Successfully processed input {input_id}: {result}")
        return result
    
    except Exception as exc:
        db.rollback()
        
        # Update input status to failed
        try:
            raw_input = db.query(RawInput).filter(
                RawInput.id == input_uuid
            ).first()
            if raw_input:
                raw_input.status = InputStatus.FAILED
                raw_input.error_message = str(exc)[:500]
                db.commit()
        except:
            pass
        
        logger.error(f"Failed to process input {input_id}: {exc}")
        raise self.retry(exc=exc)


# --- Helper functions ---

def _validate_tasks(extracted_tasks):
    """Validate and clean AI-extracted tasks."""
    validated = []
    for task in extracted_tasks:
        if not task.title or len(task.title.strip()) == 0:
            continue
        task.title = task.title.strip()[:255]
        if task.description:
            task.description = task.description.strip()
        validated.append(task)
    return validated

def _map_priority(priority_str):
    mapping = {
        "low": TaskPriority.LOW,
        "medium": TaskPriority.MEDIUM,
        "high": TaskPriority.HIGH,
        "critical": TaskPriority.CRITICAL,
    }
    return mapping.get(priority_str.lower(), TaskPriority.MEDIUM)

def _map_type(type_str):
    mapping = {
        "action": TaskType.ACTION,
        "event": TaskType.EVENT,
        "communication": TaskType.COMMUNICATION,
        "review": TaskType.REVIEW,
    }
    return mapping.get(type_str.lower(), TaskType.ACTION)

def _map_draft_type(type_str):
    mapping = {
        "email": DraftType.EMAIL,
        "message": DraftType.MESSAGE,
        "note": DraftType.NOTE,
    }
    return mapping.get(type_str.lower(), DraftType.MESSAGE)

def _find_matching_task(title, title_to_task):
    """Find a task by title (case-insensitive, fuzzy)."""
    title_lower = title.lower().strip()
    
    # Exact match
    if title_lower in title_to_task:
        return title_to_task[title_lower]
    
    # Substring match
    for key, task in title_to_task.items():
        if title_lower in key or key in title_lower:
            return task
    
    return None
```

### 11.2 — Update Input Submission to Dispatch Processing

Modify `api/v1/inputs.py` (from Story 3):

```python
@router.post("/", response_model=RawInputSubmitResponse, status_code=201)
def submit_input(data, current_user, db):
    raw_input = InputService.create_input(db, current_user.id, data)
    
    # Dispatch async processing
    from app.workers.tasks.process_input import process_input
    job = process_input.delay(str(raw_input.id))
    
    return RawInputSubmitResponse(
        input_id=raw_input.id,
        status=raw_input.status,
        job_id=job.id,
        message="Input received and queued for processing"
    )
```

### 11.3 — Processing Results Endpoint

```python
@router.get("/{input_id}/result")
def get_input_result(input_id: UUID, current_user, db):
    """Get the processing results for an input."""
    raw_input = InputService.get_input(db, current_user.id, input_id)
    
    if raw_input.status == InputStatus.PENDING:
        return {"status": "pending", "message": "Waiting in queue"}
    
    if raw_input.status == InputStatus.PROCESSING:
        return {"status": "processing", "message": "Being processed"}
    
    if raw_input.status == InputStatus.FAILED:
        return {
            "status": "failed", 
            "error": raw_input.error_message
        }
    
    # Completed — fetch related tasks and drafts
    tasks = db.query(Task).filter(Task.input_id == input_id).all()
    drafts = db.query(Draft).filter(Draft.input_id == input_id).all()
    
    return {
        "status": "completed",
        "tasks": [TaskRead.from_orm(t) for t in tasks],
        "drafts": [DraftRead.from_orm(d) for d in drafts],
        "processed_at": raw_input.processed_at
    }
```

---

## Frontend Tasks

### 11.4 — Input Submission Flow Update

Update the input submission flow:

1. User types text and clicks Submit
2. API returns `{ input_id, job_id, status: "pending" }`
3. Show **Processing Animation** component
4. Use `useJobPolling` hook OR WebSocket (Story 17) to track progress
5. On completion, display results

### 11.5 — Processing Results Component (`components/ProcessingResults.jsx`)

**Design:**
- Show after processing completes
- AI Interpretation summary at top (italic, in a card)
- Confidence indicator (emoji: 🟢 >0.8, 🟡 0.5-0.8, 🔴 <0.5)
- List of extracted tasks (using TaskCard)
- List of generated drafts (using DraftCard)
- Stats: "Extracted 4 tasks, generated 1 draft"
- Action buttons:
  - "Accept All" — keep all extracted tasks
  - "Review & Edit" — let user modify before confirming
  - "Dismiss" — discard extracted tasks

### 11.6 — Task Review & Edit Mode

Before tasks are finalized, allow the user to:
- Edit task titles
- Change priorities
- Adjust due dates
- Remove unwanted tasks
- Modify dependency links
- Edit or discard drafts

---

## Acceptance Criteria

- [ ] Submitting text input triggers async processing via Celery
- [ ] AI extracts tasks correctly from natural language
- [ ] Tasks are created in DB with correct fields
- [ ] Dependencies between tasks are automatically linked
- [ ] Drafts are generated for communication-type tasks
- [ ] Reminders are auto-created for tasks with due dates
- [ ] Input status updates: pending → processing → completed
- [ ] Failed processing sets status to "failed" with error message
- [ ] Results endpoint returns tasks, drafts, and interpretation
- [ ] Frontend shows processing animation → results
- [ ] User can review and edit extracted tasks before accepting

### Example Test Case

**Input:** "Tomorrow I have a meeting at 11, finish the report before that, send it to Aman, check logs tonight, and draft a message to my manager."

**Expected Output:**
- 5 tasks extracted:
  1. Check logs (tonight, type: review)
  2. Finish the report (tomorrow morning, type: action)
  3. Send report to Aman (before 11 AM, type: communication)
  4. Meeting at 11 AM (event)
  5. Draft a message to manager (communication)
- Dependencies: Finish report → Send to Aman → Meeting
- 2 drafts: message to Aman, message to manager
- 3 reminders: for tasks with due dates

---

## Notes

- **Single transaction**: All DB writes (tasks + drafts + dependencies + reminders) happen in one commit. If anything fails, everything rolls back.
- **db.flush()** is used to get task IDs before commit (needed for dependencies).
- The `_find_matching_task` helper does fuzzy title matching — Story 13 improves this significantly.
- Time resolution is basic here — Story 12 adds a proper engine.
- This story is the foundation that everything else connects to. Test it thoroughly.
