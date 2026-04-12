# Story 22: Dashboard & Analytics

| Field | Details |
|-------|---------|
| **Iteration** | 4 — Polish & Scale |
| **Story #** | 22 of 24 |
| **Priority** | 🟢 Medium |
| **Depends On** | Story 4 (Tasks), Story 6 (Reminders) |
| **Estimated Effort** | 1–2 days |

---

## User Story

**As a** user,  
**I want** a dashboard overview of my productivity and tasks,  
**So that** I can see statistics, recent activity, and get a quick summary of my state.

---

## Description

The Dashboard provides high-level metrics: how many tasks you've completed today, your upcoming reminders, and a breakdown of tasks by status and priority.

---

## Backend Tasks

### 22.1 — Dashboard Stats API (`api/v1/dashboard.py`)

```python
from fastapi import APIRouter, Depends
from sqlalchemy import func
from datetime import datetime, timedelta

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
@cached(key_func=lambda current_user, db: dashboard_stats_key(str(current_user.id)), ttl=300)
def get_dashboard_stats(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Get high-level dashboard metrics."""
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    
    tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status != TaskStatus.CANCELLED
    ).all()
    
    total_tasks = len(tasks)
    
    completed_today = sum(
        1 for t in tasks 
        if t.status == TaskStatus.DONE and 
        t.completed_at and t.completed_at >= start_of_day
    )
    
    overdue = sum(
        1 for t in tasks 
        if t.due_at and t.due_at < datetime.utcnow() and 
        t.status != TaskStatus.DONE
    )
    
    upcoming_reminders = db.query(Reminder).filter(
        Reminder.user_id == current_user.id,
        Reminder.status == ReminderStatus.PENDING,
        Reminder.remind_at > datetime.utcnow()
    ).count()
    
    pending_drafts = db.query(Draft).filter(
        Draft.user_id == current_user.id,
        Draft.status.in_([DraftStatus.GENERATED, DraftStatus.EDITED])
    ).count()
    
    # Breakdowns
    by_status = defaultdict(int)
    by_priority = defaultdict(int)
    for t in tasks:
        by_status[t.status.value] += 1
        by_priority[t.priority.value] += 1
        
    return {
        "total_tasks": total_tasks,
        "completed_today": completed_today,
        "overdue": overdue,
        "upcoming_reminders": upcoming_reminders,
        "pending_drafts": pending_drafts,
        "tasks_by_status": dict(by_status),
        "tasks_by_priority": dict(by_priority)
    }
```

### 22.2 — Activity Log Model (Optional)

```python
class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"))
    action = Column(String(50))  # task_created, draft_sent, reminder_fired
    entity_id = Column(UUID)
    metadata = Column(JSON)
    created_at = Column(DateTime)
```

If not building full activity logs, just use `Task.updated_at` to show "Recent Tasks".

---

## Frontend Tasks

### 22.3 — Dashboard Page (`pages/DashboardPage.jsx`)

**Layout:**
- Top row: 4 Stat Cards (Overview numbers)
- Middle row: Charts (Status Donut Chart, Priority Bar Chart)
- Bottom row: Recent Activity Feed / Upcoming Items

**Stat Cards:**
- Total Active Tasks
- Completed Today (with +2 arrow indicator)
- Overdue (red text if > 0)
- Pending Drafts

**Charts (using `recharts`):**
- Donut chart showing Todo / In Progress / Done
- Bar chart showing Low / Medium / High / Critical

**Quick Actions:**
- Add `InputBox` component at the very top for rapid task submission.
- "Add Task Manually" button.

---

## Acceptance Criteria

- [ ] `GET /api/v1/dashboard/stats` returns accurate counts
- [ ] Stats endpoint is cached in Redis
- [ ] Dashboard page shows 4 stat cards with numbers
- [ ] Dashboard shows donut and bar charts
- [ ] Input box is prominently featured on the dashboard
