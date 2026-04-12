# Story 20: Timeline View (Primary UI)

| Field | Details |
|-------|---------|
| **Iteration** | 4 — Polish & Scale |
| **Story #** | 20 of 24 |
| **Priority** | 🔴 Critical |
| **Depends On** | Story 4 (Tasks), Story 16 (Caching) |
| **Estimated Effort** | 3–4 days |

---

## User Story

**As a** user,  
**I want** a beautiful timeline view of my tasks grouped by date,  
**So that** I can see what's coming up and plan my day at a glance.

---

## Description

The Timeline is the **primary dashboard view** — the first thing users see after login. It must be visually stunning and functionally rich.

---

## Backend Tasks

### 20.1 — Timeline API (`api/v1/timeline.py`)

```python
@router.get("/timeline")
def get_timeline(
    start_date: date = None,  # Default: today
    end_date: date = None,    # Default: 7 days from now
    current_user, db
):
    """Get tasks grouped by date for timeline view."""
    tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.due_at.between(start_date, end_date),
        Task.status != TaskStatus.CANCELLED
    ).order_by(Task.due_at.asc()).all()
    
    # Group by date
    grouped = defaultdict(list)
    for task in tasks:
        day = task.due_at.date()
        grouped[day].append(task)
    
    timeline = []
    for day in sorted(grouped.keys()):
        label = _format_day_label(day)  # "Today", "Tomorrow", "Monday Apr 14"
        timeline.append({
            "date": str(day),
            "label": label,
            "tasks": [TaskRead.from_orm(t) for t in grouped[day]]
        })
    
    # Add undated tasks section
    undated = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.due_at.is_(None),
        Task.status.notin_([TaskStatus.DONE, TaskStatus.CANCELLED])
    ).all()
    
    if undated:
        timeline.append({
            "date": None,
            "label": "No Date Set",
            "tasks": [TaskRead.from_orm(t) for t in undated]
        })
    
    return {"timeline": timeline}
```

### 20.2 — Cache Timeline

Cache with key `user:{id}:timeline:{start}:{end}`, TTL 5 minutes.

---

## Frontend Tasks

### 20.3 — Timeline Page Design

**Visual design elements:**

**Layout:**
- Vertical timeline with a line running down the left side
- Date headers are floating badges on the line
- Task cards branch off to the right
- "Now" marker: glowing current-time indicator with subtle pulse

**Date Headers:**
- Bold, large text: "Today", "Tomorrow", "Monday, Apr 14"
- Task count badge: "(4 tasks)"
- Expandable/collapsible (default: today expanded, others collapsed)

**Task Cards on Timeline:**
- Left border colored by priority (critical=red, high=orange, medium=blue, low=gray)
- Time badge: "11:00 AM" positioned above the card
- Title (bold), description snippet (gray)
- Status pill (color-coded)
- Task type icon
- Dependency indicator (🔗 if has dependencies)
- Reminder indicator (🔔 if reminder set)
- Quick actions on hover: ✅ Done, ⏰ Snooze, ✏️ Edit

**Animations:**
- Smooth expand/collapse for day sections
- Fade-in cascade for task cards on load
- Pulse animation for overdue tasks
- Confetti micro-animation when marking task done
- Slide-out animation when dismissing a task

**Responsive:**
- Desktop: vertical timeline, cards on right
- Mobile: simplified list view, horizontal date scroll at top

### 20.4 — Quick Actions

- **Mark Done**: Click ✅ → task slides out with green checkmark → counter updates
- **Snooze**: Click ⏰ → dropdown with "1 hour", "3 hours", "tomorrow" → updates due_at
- **Change Priority**: Right-click → priority selector

### 20.5 — Date Navigation

- Date range picker in header
- Quick buttons: "Today", "This Week", "This Month"
- Navigation arrows: ← Previous week | Next week →

---

## Acceptance Criteria

- [ ] Timeline shows tasks grouped by day
- [ ] Color coding by priority
- [ ] "Now" marker is visible and animated
- [ ] Expand/collapse day sections works smoothly
- [ ] Quick actions (done, snooze) work inline
- [ ] Responsive on mobile
- [ ] Cached for performance
- [ ] Overdue tasks are visually distinct (red pulse)
