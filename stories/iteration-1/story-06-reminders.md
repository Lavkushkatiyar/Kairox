# Story 6: Reminder Data Model & API

| Field | Details |
|-------|---------|
| **Iteration** | 1 — Foundation |
| **Story #** | 6 of 24 |
| **Priority** | 🟡 High |
| **Depends On** | Story 4 (Task CRUD) |
| **Blocks** | Story 14 (Reminder Worker) |
| **Estimated Effort** | 1–2 days |

---

## User Story

**As a** user,  
**I want** to create reminders for my tasks,  
**So that** I receive timely notifications before deadlines and don't miss important events.

---

## Description

Reminders are one of the key automated features of Kairox. They ensure users don't forget about upcoming tasks. This story covers:

1. `Reminder` data model with types (pre-event, deadline, follow-up).
2. CRUD API for managing reminders.
3. Frontend components for viewing and creating reminders.

**Note:** At this stage, reminders are **stored** only — actual firing/execution comes in Story 14 (Reminder Worker).

---

## Backend Tasks

### 6.1 — Create Reminder Model (`models/reminder.py`)

```python
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class ReminderType(str, enum.Enum):
    PRE_EVENT = "pre_event"       # Fires before an event (e.g., 30 min before meeting)
    DEADLINE = "deadline"          # Fires at/near a deadline
    FOLLOW_UP = "follow_up"       # Fires after a task to check status

class ReminderStatus(str, enum.Enum):
    PENDING = "pending"           # Waiting to fire
    SENT = "sent"                 # Successfully delivered
    FAILED = "failed"             # Delivery failed
    CANCELLED = "cancelled"       # Manually cancelled by user

class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("tasks.id", ondelete="CASCADE"), 
        nullable=False
    )
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id"), 
        nullable=False
    )
    
    remind_at = Column(DateTime, nullable=False)         # When to fire
    reminder_type = Column(
        Enum(ReminderType), 
        default=ReminderType.DEADLINE, 
        nullable=False
    )
    status = Column(
        Enum(ReminderStatus), 
        default=ReminderStatus.PENDING, 
        nullable=False
    )
    message = Column(Text, nullable=True)                # Custom message (optional)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)            # When it was actually sent
    
    # Relationships
    task = relationship("Task", back_populates="reminders")
    user = relationship("User", backref="reminders")
```

**Key design decisions:**
- `remind_at` is the absolute datetime when the reminder should fire
- `reminder_type` distinguishes between different trigger reasons
- `status` tracks the lifecycle: pending → sent/failed/cancelled
- `sent_at` records actual delivery time (for latency analysis)
- `ON DELETE CASCADE` — if task is deleted, its reminders go too

### 6.2 — Create Pydantic Schemas (`schemas/reminder.py`)

```python
from pydantic import BaseModel, Field, validator
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.reminder import ReminderType, ReminderStatus

# --- Request Schemas ---

class ReminderCreate(BaseModel):
    task_id: UUID
    remind_at: datetime
    reminder_type: ReminderType = ReminderType.DEADLINE
    message: Optional[str] = None

    @validator('remind_at')
    def remind_at_must_be_future(cls, v):
        if v <= datetime.utcnow():
            raise ValueError("Reminder time must be in the future")
        return v

class ReminderUpdate(BaseModel):
    remind_at: Optional[datetime] = None
    reminder_type: Optional[ReminderType] = None
    message: Optional[str] = None
    status: Optional[ReminderStatus] = None

class AutoReminderCreate(BaseModel):
    """For automatic reminder creation from AI processing."""
    task_id: UUID
    minutes_before: int = 30    # Default: 30 min before due_at
    reminder_type: ReminderType = ReminderType.PRE_EVENT

# --- Response Schemas ---

class ReminderRead(BaseModel):
    id: UUID
    task_id: UUID
    user_id: UUID
    remind_at: datetime
    reminder_type: ReminderType
    status: ReminderStatus
    message: Optional[str]
    created_at: datetime
    sent_at: Optional[datetime]
    
    # Enriched fields (populated from task)
    task_title: Optional[str] = None
    task_due_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ReminderList(BaseModel):
    items: List[ReminderRead]
    total: int
    upcoming_count: int  # How many are pending + in the future
```

### 6.3 — Create Reminder Service (`services/reminder_service.py`)

```python
from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import UUID
from datetime import datetime, timedelta
from app.models.reminder import Reminder, ReminderStatus, ReminderType
from app.models.task import Task
from app.schemas.reminder import ReminderCreate, ReminderUpdate

class ReminderService:

    @staticmethod
    def create_reminder(
        db: Session, 
        user_id: UUID, 
        data: ReminderCreate
    ) -> Reminder:
        """Create a reminder for a task."""
        # Verify task exists and belongs to user
        task = db.query(Task).filter(
            Task.id == data.task_id, Task.user_id == user_id
        ).first()
        if not task:
            raise ValueError("Task not found")

        reminder = Reminder(
            task_id=data.task_id,
            user_id=user_id,
            remind_at=data.remind_at,
            reminder_type=data.reminder_type,
            message=data.message,
            status=ReminderStatus.PENDING
        )
        db.add(reminder)
        db.commit()
        db.refresh(reminder)
        return reminder

    @staticmethod
    def auto_create_reminder(
        db: Session,
        user_id: UUID,
        task_id: UUID,
        minutes_before: int = 30
    ) -> Reminder | None:
        """
        Auto-create a reminder based on task's due_at.
        Used during AI processing pipeline (Story 11).
        Returns None if task has no due_at.
        """
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task or not task.due_at:
            return None

        remind_at = task.due_at - timedelta(minutes=minutes_before)
        
        # Don't create if remind_at is in the past
        if remind_at <= datetime.utcnow():
            return None

        reminder = Reminder(
            task_id=task_id,
            user_id=user_id,
            remind_at=remind_at,
            reminder_type=ReminderType.PRE_EVENT,
            message=f"Reminder: '{task.title}' is due in {minutes_before} minutes",
            status=ReminderStatus.PENDING
        )
        db.add(reminder)
        db.commit()
        db.refresh(reminder)
        return reminder

    @staticmethod
    def get_reminders(
        db: Session,
        user_id: UUID,
        upcoming_only: bool = False,
        task_id: UUID = None
    ) -> dict:
        """Get user's reminders, optionally filtered."""
        query = db.query(Reminder).filter(Reminder.user_id == user_id)

        if upcoming_only:
            query = query.filter(
                Reminder.status == ReminderStatus.PENDING,
                Reminder.remind_at > datetime.utcnow()
            )

        if task_id:
            query = query.filter(Reminder.task_id == task_id)

        items = query.order_by(Reminder.remind_at.asc()).all()
        
        upcoming_count = db.query(Reminder).filter(
            Reminder.user_id == user_id,
            Reminder.status == ReminderStatus.PENDING,
            Reminder.remind_at > datetime.utcnow()
        ).count()

        # Enrich with task info
        for item in items:
            task = db.query(Task).filter(Task.id == item.task_id).first()
            if task:
                item.task_title = task.title
                item.task_due_at = task.due_at

        return {
            "items": items,
            "total": len(items),
            "upcoming_count": upcoming_count
        }

    @staticmethod
    def update_reminder(
        db: Session,
        user_id: UUID,
        reminder_id: UUID,
        data: ReminderUpdate
    ) -> Reminder:
        """Update a reminder's fields."""
        reminder = db.query(Reminder).filter(
            Reminder.id == reminder_id, 
            Reminder.user_id == user_id
        ).first()
        if not reminder:
            raise ValueError("Reminder not found")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(reminder, field, value)
        
        db.commit()
        db.refresh(reminder)
        return reminder

    @staticmethod
    def cancel_reminder(
        db: Session, 
        user_id: UUID, 
        reminder_id: UUID
    ):
        """Cancel a pending reminder."""
        reminder = db.query(Reminder).filter(
            Reminder.id == reminder_id,
            Reminder.user_id == user_id,
            Reminder.status == ReminderStatus.PENDING
        ).first()
        if not reminder:
            raise ValueError("Pending reminder not found")
        
        reminder.status = ReminderStatus.CANCELLED
        db.commit()

    @staticmethod
    def mark_sent(db: Session, reminder_id: UUID):
        """Mark a reminder as sent (used by worker in Story 14)."""
        reminder = db.query(Reminder).filter(
            Reminder.id == reminder_id
        ).first()
        if reminder:
            reminder.status = ReminderStatus.SENT
            reminder.sent_at = datetime.utcnow()
            db.commit()

    @staticmethod
    def get_due_reminders(db: Session) -> list:
        """
        Get all reminders that should fire now.
        Used by the reminder worker (Story 14).
        """
        return db.query(Reminder).filter(
            Reminder.status == ReminderStatus.PENDING,
            Reminder.remind_at <= datetime.utcnow()
        ).all()
```

### 6.4 — Create Reminder API Endpoints (`api/v1/reminders.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.reminder import ReminderCreate, ReminderRead, ReminderUpdate, ReminderList
from app.services.reminder_service import ReminderService

router = APIRouter(prefix="/reminders", tags=["Reminders"])

@router.post("/", response_model=ReminderRead, status_code=201)
def create_reminder(
    data: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a reminder for a task."""
    try:
        return ReminderService.create_reminder(db, current_user.id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=ReminderList)
def list_reminders(
    upcoming_only: bool = Query(False),
    task_id: UUID = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List reminders. 
    Use upcoming_only=true to see only pending future reminders.
    """
    return ReminderService.get_reminders(
        db, current_user.id, upcoming_only, task_id
    )

@router.patch("/{reminder_id}", response_model=ReminderRead)
def update_reminder(
    reminder_id: UUID,
    data: ReminderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a reminder (time, message, etc.)."""
    try:
        return ReminderService.update_reminder(
            db, current_user.id, reminder_id, data
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{reminder_id}", status_code=204)
def cancel_reminder(
    reminder_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a pending reminder."""
    try:
        ReminderService.cancel_reminder(db, current_user.id, reminder_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

---

## Frontend Tasks

### 6.5 — Reminder Service (`services/reminderService.js`)

```javascript
import api from './api';

const reminderService = {
  createReminder: async (taskId, remindAt, type = 'deadline', message = null) => {
    const response = await api.post('/api/v1/reminders', {
      task_id: taskId,
      remind_at: remindAt,
      reminder_type: type,
      message,
    });
    return response.data;
  },

  getReminders: async (upcomingOnly = false, taskId = null) => {
    const params = { upcoming_only: upcomingOnly };
    if (taskId) params.task_id = taskId;
    const response = await api.get('/api/v1/reminders', { params });
    return response.data;
  },

  updateReminder: async (reminderId, data) => {
    const response = await api.patch(`/api/v1/reminders/${reminderId}`, data);
    return response.data;
  },

  cancelReminder: async (reminderId) => {
    await api.delete(`/api/v1/reminders/${reminderId}`);
  },
};

export default reminderService;
```

### 6.6 — Reminder Badge on Task Card

Update `TaskCard.jsx`:
- If task has pending reminders, show 🔔 icon
- Tooltip shows: *"Reminder set for 10:30 AM"*
- If reminder has fired (sent), show ✅🔔
- Multiple reminders: show count badge (🔔 ×2)

### 6.7 — Upcoming Reminders Panel (`components/ReminderPanel.jsx`)

**Design:**
- Sidebar or collapsible panel
- Header: "Upcoming Reminders" with count badge
- Listed by time (soonest first)
- Each item shows:
  - Task title (linked)
  - Reminder time (relative: "in 2 hours")
  - Reminder type icon (🔔 pre-event, ⏰ deadline, 🔄 follow-up)
  - Cancel button (X)
- Empty state: "No upcoming reminders 🎉"

### 6.8 — Add Reminder Form (`components/AddReminderForm.jsx`)

**Shown in Task Detail panel:**
- Date/time picker for `remind_at`
- Reminder type selector (Pre-event, Deadline, Follow-up)
- Optional message textarea
- Quick presets:
  - "30 minutes before" (if task has due_at)
  - "1 hour before"
  - "1 day before"
  - "Custom..."
- Validation: cannot set reminder in the past

---

## Database Tasks

### 6.9 — Generate Migration

```bash
alembic revision --autogenerate -m "create_reminders_table"
alembic upgrade head
```

### 6.10 — Table Structure

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY |
| `task_id` | UUID | FOREIGN KEY → tasks.id ON DELETE CASCADE, NOT NULL |
| `user_id` | UUID | FOREIGN KEY → users.id, NOT NULL |
| `remind_at` | TIMESTAMP | NOT NULL |
| `reminder_type` | ENUM | NOT NULL, DEFAULT 'deadline' |
| `status` | ENUM | NOT NULL, DEFAULT 'pending' |
| `message` | TEXT | NULLABLE |
| `created_at` | TIMESTAMP | DEFAULT now() |
| `sent_at` | TIMESTAMP | NULLABLE |

### 6.11 — Indexes

- [ ] `(user_id, remind_at)` — for listing upcoming reminders by user
- [ ] `(status, remind_at)` — **critical** for worker polling in Story 14
- [ ] `(task_id)` — for looking up reminders by task

---

## Acceptance Criteria

- [ ] `POST /api/v1/reminders` creates a reminder and returns it
- [ ] Past-time reminders are rejected with validation error
- [ ] `GET /api/v1/reminders` returns user's reminders
- [ ] `GET /api/v1/reminders?upcoming_only=true` returns only pending future reminders
- [ ] `GET /api/v1/reminders?task_id={id}` returns reminders for specific task
- [ ] `PATCH /api/v1/reminders/{id}` updates reminder fields
- [ ] `DELETE /api/v1/reminders/{id}` cancels a pending reminder
- [ ] Deleting a task cascades and removes its reminders
- [ ] Frontend shows reminder badges on task cards
- [ ] Add Reminder form works with date picker and presets
- [ ] Upcoming reminders panel shows sorted list

---

## Notes

- Reminders don't *do* anything yet — Story 14 adds the Celery Beat scheduler that checks and fires them.
- The `auto_create_reminder()` method will be called from Story 11's processing pipeline.
- The `get_due_reminders()` method will be used by Story 14's worker.
- Consider a maximum of 5 reminders per task to prevent spam.
