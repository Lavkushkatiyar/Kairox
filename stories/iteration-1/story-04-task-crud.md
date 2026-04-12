# Story 4: Task Data Model & CRUD API

| Field | Details |
|-------|---------|
| **Iteration** | 1 — Foundation |
| **Story #** | 4 of 24 |
| **Priority** | 🔴 Critical |
| **Depends On** | Story 1 (Scaffolding), Story 2 (Auth), Story 3 (Raw Input) |
| **Blocks** | Story 5 (Dependencies), Story 6 (Reminders), Story 11 (Pipeline), Story 20 (Timeline) |
| **Estimated Effort** | 2–3 days |

---

## User Story

**As a** user,  
**I want** to create, view, edit, and manage tasks,  
**So that** I can track my work items extracted from my thoughts.

---

## Description

The Task model is the **central entity** of Kairox. Everything revolves around tasks:
- AI extracts tasks from raw input (Story 11)
- Dependencies link tasks together (Story 5)
- Reminders are attached to tasks (Story 6)
- Drafts are generated for communication tasks (Story 7)
- Timeline and structure views display tasks (Stories 20–21)

This story builds the full CRUD infrastructure for tasks.

---

## Backend Tasks

### 4.1 — Create Task Model (`models/task.py`)

```python
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"

class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TaskType(str, enum.Enum):
    ACTION = "action"           # Do something
    EVENT = "event"             # Attend something
    COMMUNICATION = "communication"  # Send/tell someone
    REVIEW = "review"           # Check/verify something

class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    input_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("raw_inputs.id"), 
        nullable=True  # nullable for manually created tasks
    )
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id"), 
        nullable=False
    )
    
    # Core fields
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.TODO, nullable=False)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM, nullable=False)
    task_type = Column(Enum(TaskType), default=TaskType.ACTION, nullable=False)
    
    # Scheduling
    due_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Ordering
    sort_order = Column(Integer, default=0)
    
    # Metadata
    ai_generated = Column(Boolean, default=False)  # Was this created by AI?
    ai_confidence = Column(Float, nullable=True)    # How confident was AI? 0.0–1.0
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="tasks")
    input = relationship("RawInput", back_populates="tasks")
    reminders = relationship("Reminder", back_populates="task", cascade="all, delete-orphan")
    drafts = relationship("Draft", back_populates="task")
    
    # Dependencies (defined in Story 5)
    # dependencies = relationship(...)
    # dependents = relationship(...)
```

**Key design decisions:**
- `input_id` is **nullable** — users can manually create tasks too
- `task_type` helps the system decide what to do (e.g., generate draft for `communication`)
- `ai_generated` and `ai_confidence` track AI origin and reliability
- `sort_order` enables custom ordering within lists
- `completed_at` is separate from `updated_at` for metrics

### 4.2 — Create Pydantic Schemas (`schemas/task.py`)

```python
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.task import TaskStatus, TaskPriority, TaskType

# --- Request Schemas ---

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    task_type: TaskType = TaskType.ACTION
    due_at: Optional[datetime] = None
    input_id: Optional[UUID] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    task_type: Optional[TaskType] = None
    due_at: Optional[datetime] = None
    sort_order: Optional[int] = None

class TaskBulkCreate(BaseModel):
    """For creating multiple tasks from AI processing."""
    tasks: List[TaskCreate]
    input_id: UUID

class TaskFilter(BaseModel):
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    task_type: Optional[TaskType] = None
    due_before: Optional[datetime] = None
    due_after: Optional[datetime] = None
    search: Optional[str] = None  # Search in title/description

# --- Response Schemas ---

class TaskRead(BaseModel):
    id: UUID
    input_id: Optional[UUID]
    user_id: UUID
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    task_type: TaskType
    due_at: Optional[datetime]
    completed_at: Optional[datetime]
    sort_order: int
    ai_generated: bool
    ai_confidence: Optional[float]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TaskList(BaseModel):
    items: List[TaskRead]
    total: int
    page: int
    page_size: int
    has_more: bool

class TaskStats(BaseModel):
    total: int
    by_status: dict  # { "todo": 5, "in_progress": 3, ... }
    by_priority: dict  # { "low": 2, "medium": 5, ... }
    overdue: int
```

### 4.3 — Create Task Service (`services/task_service.py`)

```python
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.task import Task, TaskStatus, TaskPriority, TaskType
from app.schemas.task import TaskCreate, TaskUpdate, TaskFilter, TaskList, TaskStats

class TaskService:

    @staticmethod
    def create_task(db: Session, user_id: UUID, data: TaskCreate) -> Task:
        """Create a single task."""
        task = Task(
            user_id=user_id,
            input_id=data.input_id,
            title=data.title,
            description=data.description,
            status=data.status,
            priority=data.priority,
            task_type=data.task_type,
            due_at=data.due_at,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def bulk_create_tasks(
        db: Session, 
        user_id: UUID, 
        tasks_data: list[TaskCreate],
        input_id: UUID = None
    ) -> list[Task]:
        """Create multiple tasks in a single transaction (for AI processing)."""
        tasks = []
        for i, data in enumerate(tasks_data):
            task = Task(
                user_id=user_id,
                input_id=input_id or data.input_id,
                title=data.title,
                description=data.description,
                status=data.status,
                priority=data.priority,
                task_type=data.task_type,
                due_at=data.due_at,
                sort_order=i,
                ai_generated=True if input_id else False,
            )
            db.add(task)
            tasks.append(task)
        db.commit()
        for task in tasks:
            db.refresh(task)
        return tasks

    @staticmethod
    def get_tasks(
        db: Session,
        user_id: UUID,
        filters: TaskFilter = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> TaskList:
        """Get filtered, paginated task list."""
        query = db.query(Task).filter(Task.user_id == user_id)

        if filters:
            if filters.status:
                query = query.filter(Task.status == filters.status)
            if filters.priority:
                query = query.filter(Task.priority == filters.priority)
            if filters.task_type:
                query = query.filter(Task.task_type == filters.task_type)
            if filters.due_before:
                query = query.filter(Task.due_at <= filters.due_before)
            if filters.due_after:
                query = query.filter(Task.due_at >= filters.due_after)
            if filters.search:
                search_term = f"%{filters.search}%"
                query = query.filter(
                    (Task.title.ilike(search_term)) | 
                    (Task.description.ilike(search_term))
                )

        total = query.count()

        # Sorting
        sort_column = getattr(Task, sort_by, Task.created_at)
        if sort_order == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())

        items = query.offset((page - 1) * page_size).limit(page_size).all()

        return TaskList(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_more=(page * page_size) < total
        )

    @staticmethod
    def get_task(db: Session, user_id: UUID, task_id: UUID) -> Task:
        """Get a single task by ID."""
        task = (
            db.query(Task)
            .filter(Task.id == task_id, Task.user_id == user_id)
            .first()
        )
        if not task:
            raise ValueError("Task not found")
        return task

    @staticmethod
    def update_task(
        db: Session, 
        user_id: UUID, 
        task_id: UUID, 
        data: TaskUpdate
    ) -> Task:
        """Update a task's fields."""
        task = TaskService.get_task(db, user_id, task_id)
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)

        # Auto-set completed_at when marking done
        if data.status == TaskStatus.DONE and task.completed_at is None:
            task.completed_at = datetime.utcnow()
        elif data.status and data.status != TaskStatus.DONE:
            task.completed_at = None

        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def delete_task(db: Session, user_id: UUID, task_id: UUID) -> None:
        """Delete a task."""
        task = TaskService.get_task(db, user_id, task_id)
        db.delete(task)
        db.commit()

    @staticmethod
    def get_stats(db: Session, user_id: UUID) -> TaskStats:
        """Get task statistics for the user."""
        query = db.query(Task).filter(Task.user_id == user_id)
        total = query.count()

        by_status = {}
        for status in TaskStatus:
            by_status[status.value] = query.filter(
                Task.status == status
            ).count()

        by_priority = {}
        for priority in TaskPriority:
            by_priority[priority.value] = query.filter(
                Task.priority == priority
            ).count()

        overdue = query.filter(
            Task.due_at < datetime.utcnow(),
            Task.status.notin_([TaskStatus.DONE, TaskStatus.CANCELLED])
        ).count()

        return TaskStats(
            total=total,
            by_status=by_status,
            by_priority=by_priority,
            overdue=overdue
        )
```

### 4.4 — Create Task API Endpoints (`api/v1/tasks.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.task import TaskStatus, TaskPriority, TaskType
from app.schemas.task import (
    TaskCreate, TaskRead, TaskUpdate, TaskList, TaskStats
)
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.post("/", response_model=TaskRead, status_code=201)
def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task manually."""
    return TaskService.create_task(db, current_user.id, data)

@router.get("/", response_model=TaskList)
def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: TaskStatus = None,
    priority: TaskPriority = None,
    task_type: TaskType = None,
    search: str = None,
    sort_by: str = Query("created_at", regex="^(created_at|due_at|priority|status|title)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List tasks with filtering, searching, sorting, and pagination.
    
    Filters: status, priority, task_type, search (title/description)
    Sorting: created_at, due_at, priority, status, title
    """
    from app.schemas.task import TaskFilter
    filters = TaskFilter(
        status=status,
        priority=priority,
        task_type=task_type,
        search=search
    )
    return TaskService.get_tasks(
        db, current_user.id, filters, page, page_size, sort_by, sort_order
    )

@router.get("/stats", response_model=TaskStats)
def get_task_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get task statistics (counts by status, priority, overdue)."""
    return TaskService.get_stats(db, current_user.id)

@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single task by ID."""
    try:
        return TaskService.get_task(db, current_user.id, task_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: UUID,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a task (partial update via PATCH)."""
    try:
        return TaskService.update_task(db, current_user.id, task_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a task."""
    try:
        TaskService.delete_task(db, current_user.id, task_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

---

## Frontend Tasks

### 4.5 — Task Service (`services/taskService.js`)

```javascript
import api from './api';

const taskService = {
  createTask: async (taskData) => {
    const response = await api.post('/api/v1/tasks', taskData);
    return response.data;
  },

  getTasks: async (params = {}) => {
    const response = await api.get('/api/v1/tasks', { params });
    return response.data;
  },

  getTask: async (taskId) => {
    const response = await api.get(`/api/v1/tasks/${taskId}`);
    return response.data;
  },

  updateTask: async (taskId, updateData) => {
    const response = await api.patch(`/api/v1/tasks/${taskId}`, updateData);
    return response.data;
  },

  deleteTask: async (taskId) => {
    await api.delete(`/api/v1/tasks/${taskId}`);
  },

  getStats: async () => {
    const response = await api.get('/api/v1/tasks/stats');
    return response.data;
  },
};

export default taskService;
```

### 4.6 — Task Card Component (`components/TaskCard.jsx`)

**Design requirements:**
- Compact card showing key task info at a glance
- **Left edge**: Priority color bar (critical=red, high=orange, medium=blue, low=gray)
- **Title**: Bold, truncated if too long
- **Status badge**: Colored pill (todo=gray, in_progress=blue, done=green, cancelled=red-strikethrough)
- **Due date**: Relative time ("in 3 hours", "tomorrow", "overdue!")
- **Task type icon**: 📋 action, 📅 event, 💬 communication, 🔍 review
- **AI badge**: Small "AI" tag if `ai_generated == true`
- **Quick actions on hover**: ✅ Mark done, ✏️ Edit, 🗑️ Delete

**Behavior:**
- [ ] Click card → open Task Detail panel
- [ ] Click ✅ → toggle status to done (inline, no page reload)
- [ ] Overdue tasks show red pulsing dot

### 4.7 — Task List Component (`components/TaskList.jsx`)

**Design requirements:**
- Header with filter controls:
  - Status dropdown (All, Todo, In Progress, Done, Cancelled)
  - Priority dropdown (All, Low, Medium, High, Critical)
  - Type dropdown (All, Action, Event, Communication, Review)
  - Search box (debounced, searches title + description)
  - Sort dropdown (Newest, Due Date, Priority)
- List of `TaskCard` components
- Empty state: Friendly illustration + "No tasks yet" message
- Loading skeleton while fetching
- Pagination controls at bottom

### 4.8 — Task Detail Panel (`components/TaskDetail.jsx`)

**Design requirements:**
- Slide-in panel from right (or modal)
- Editable fields:
  - Title (inline edit)
  - Description (markdown-supported textarea)
  - Status (dropdown)
  - Priority (dropdown)
  - Type (dropdown)
  - Due date (date/time picker)
- Metadata section (read-only):
  - Created at
  - Updated at
  - Source (manual or AI-generated)
  - Linked input (click to view original text)
- Action buttons:
  - Save changes
  - Delete task (with confirmation)
  - Add reminder (links to Story 6)
  - Add dependency (links to Story 5)

### 4.9 — Create Task Modal (`components/CreateTaskModal.jsx`)

**For manually creating tasks (not from AI):**
- Title input (required)
- Description textarea
- Priority selector (visual: color-coded buttons)
- Type selector (icon buttons)
- Due date/time picker
- Create button with validation

### 4.10 — Task Store (`store/taskStore.js`)

```javascript
import { create } from 'zustand';
import taskService from '../services/taskService';

const useTaskStore = create((set, get) => ({
  tasks: [],
  total: 0,
  page: 1,
  filters: {},
  isLoading: false,
  selectedTask: null,
  stats: null,

  fetchTasks: async (page = 1, filters = {}) => {
    set({ isLoading: true });
    try {
      const data = await taskService.getTasks({ page, ...filters });
      set({ tasks: data.items, total: data.total, page, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createTask: async (taskData) => {
    const newTask = await taskService.createTask(taskData);
    await get().fetchTasks(get().page, get().filters);
    return newTask;
  },

  updateTask: async (taskId, updateData) => {
    const updated = await taskService.updateTask(taskId, updateData);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
      selectedTask: state.selectedTask?.id === taskId ? updated : state.selectedTask,
    }));
    return updated;
  },

  deleteTask: async (taskId) => {
    await taskService.deleteTask(taskId);
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      selectedTask: null,
    }));
  },

  selectTask: (task) => set({ selectedTask: task }),
  clearSelection: () => set({ selectedTask: null }),

  fetchStats: async () => {
    const stats = await taskService.getStats();
    set({ stats });
  },
}));

export default useTaskStore;
```

---

## Database Tasks

### 4.11 — Generate Migration

```bash
alembic revision --autogenerate -m "create_tasks_table"
alembic upgrade head
```

### 4.12 — Table Structure

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY |
| `input_id` | UUID | FOREIGN KEY → raw_inputs.id, NULLABLE |
| `user_id` | UUID | FOREIGN KEY → users.id, NOT NULL |
| `title` | VARCHAR(255) | NOT NULL |
| `description` | TEXT | NULLABLE |
| `status` | ENUM | NOT NULL, DEFAULT 'todo' |
| `priority` | ENUM | NOT NULL, DEFAULT 'medium' |
| `task_type` | ENUM | NOT NULL, DEFAULT 'action' |
| `due_at` | TIMESTAMP | NULLABLE |
| `completed_at` | TIMESTAMP | NULLABLE |
| `sort_order` | INTEGER | DEFAULT 0 |
| `ai_generated` | BOOLEAN | DEFAULT false |
| `ai_confidence` | FLOAT | NULLABLE |
| `created_at` | TIMESTAMP | DEFAULT now() |
| `updated_at` | TIMESTAMP | DEFAULT now() |

### 4.13 — Indexes

- [ ] `(user_id, status)` — filtering by status
- [ ] `(user_id, due_at)` — timeline queries
- [ ] `(user_id, priority)` — priority filtering
- [ ] `(input_id)` — lookup tasks from an input
- [ ] Consider partial index: `WHERE status NOT IN ('done', 'cancelled')` for active task queries
- [ ] Full-text search index on `(title, description)` for search queries

---

## Acceptance Criteria

- [ ] `POST /api/v1/tasks` creates a task and returns it
- [ ] `GET /api/v1/tasks` returns filtered, sorted, paginated tasks
- [ ] `GET /api/v1/tasks/{id}` returns a single task
- [ ] `PATCH /api/v1/tasks/{id}` partially updates a task
- [ ] Setting status to "done" auto-sets `completed_at`
- [ ] `DELETE /api/v1/tasks/{id}` removes the task
- [ ] `GET /api/v1/tasks/stats` returns correct counts
- [ ] Search filter finds tasks by title and description
- [ ] User A cannot access User B's tasks
- [ ] Frontend task list renders with filter/sort controls
- [ ] Task cards show priority colors, status badges, and type icons
- [ ] Task detail panel opens and allows editing
- [ ] Manual task creation via modal works

---

## Notes

- This is the **most-referenced model** in the project. Get it right.
- The `bulk_create_tasks` method is critical for Story 11's pipeline.
- Consider adding soft delete (set `status = cancelled` instead of hard delete) for data recovery.
- The `ai_confidence` field helps users decide how much to trust AI-extracted tasks.
