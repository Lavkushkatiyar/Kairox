# Story 14: Reminder Execution Worker

| Field | Details |
|-------|---------|
| **Iteration** | 3 — Automation |
| **Story #** | 14 of 24 |
| **Priority** | 🔴 Critical |
| **Depends On** | Story 6 (Reminders), Story 9 (Celery) |
| **Estimated Effort** | 2 days |

---

## User Story

**As a** user,  
**I want** reminders to fire at the correct time and notify me,  
**So that** I never miss a deadline or forget an important task.

---

## Description

Story 6 created the reminder model. This story makes reminders **actually fire** by:

1. **Celery Beat** scheduler that checks for due reminders every 60 seconds.
2. **Reminder sender** task that creates a notification when a reminder fires.
3. **Notification model** for storing delivered notifications.
4. **Notification API** for the frontend to fetch and manage notifications.
5. **Notification bell** UI component with real-time updates.

---

## Backend Tasks

### 14.1 — Notification Model (`models/notification.py`)

```python
class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    reminder_id = Column(UUID, ForeignKey("reminders.id"), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="reminder")  # reminder, system, info
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### 14.2 — Celery Beat Schedule

```python
# In celery_app.py
celery_app.conf.beat_schedule = {
    "check-pending-reminders": {
        "task": "check_pending_reminders",
        "schedule": 60.0,  # Every 60 seconds
    },
}
```

### 14.3 — Reminder Worker Tasks (`workers/tasks/reminders.py`)

```python
@celery_app.task(name="check_pending_reminders")
def check_pending_reminders():
    """Periodic task: find and dispatch due reminders."""
    db = SessionLocal()
    try:
        due_reminders = ReminderService.get_due_reminders(db)
        for reminder in due_reminders:
            send_reminder.delay(str(reminder.id))
        return {"checked": True, "dispatched": len(due_reminders)}
    finally:
        db.close()

@celery_app.task(bind=True, base=KairoxTask, max_retries=3)
def send_reminder(self, reminder_id: str):
    """Send a single reminder → create notification."""
    db = self.db
    reminder = db.query(Reminder).filter(Reminder.id == UUID(reminder_id)).first()
    if not reminder or reminder.status != ReminderStatus.PENDING:
        return
    
    task = db.query(Task).filter(Task.id == reminder.task_id).first()
    
    notification = Notification(
        user_id=reminder.user_id,
        reminder_id=reminder.id,
        title=f"⏰ Reminder: {task.title}" if task else "⏰ Reminder",
        message=reminder.message or f"Don't forget: {task.title}",
        notification_type="reminder"
    )
    db.add(notification)
    
    reminder.status = ReminderStatus.SENT
    reminder.sent_at = datetime.utcnow()
    db.commit()
    
    # Publish WebSocket event (Story 17)
    # redis.publish(f"user:{reminder.user_id}", ...)
```

### 14.4 — Notification API (`api/v1/notifications.py`)

- `GET /api/v1/notifications` — list (unread first), paginated
- `GET /api/v1/notifications/unread-count` — just the count
- `PATCH /api/v1/notifications/{id}/read` — mark one as read
- `POST /api/v1/notifications/read-all` — mark all as read

---

## Frontend Tasks

### 14.5 — Notification Bell Component

- Bell icon in the top navigation bar
- Red badge with unread count
- Click opens dropdown with notification list
- Each item: title, message, relative time, read/unread indicator
- Click notification → mark as read + navigate to related task

### 14.6 — Toast Notifications

- When new notification arrives, show a toast/snackbar
- Auto-dismiss after 5 seconds
- Click to view full notification

---

## Database Tasks

- Migration for `notifications` table
- Index on `(user_id, is_read, created_at)`

---

## Acceptance Criteria

- [ ] Celery Beat runs `check_pending_reminders` every 60 seconds
- [ ] Due reminders trigger notification creation
- [ ] Reminder status updates to `sent` with `sent_at` timestamp
- [ ] Notification API returns unread notifications
- [ ] Frontend bell shows unread count
- [ ] Marking notifications as read works
