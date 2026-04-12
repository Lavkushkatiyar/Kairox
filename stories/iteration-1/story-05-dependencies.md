# Story 5: Dependency Data Model & API

| Field | Details |
|-------|---------|
| **Iteration** | 1 — Foundation |
| **Story #** | 5 of 24 |
| **Priority** | 🟡 High |
| **Depends On** | Story 4 (Task CRUD) |
| **Blocks** | Story 13 (Dependency Engine), Story 21 (Structure View) |
| **Estimated Effort** | 1–2 days |

---

## User Story

**As a** user,  
**I want** to define dependencies between tasks,  
**So that** I can see execution order, know which tasks are blocked, and understand the flow of my work.

---

## Description

Dependencies are what make Kairox more than a simple to-do list. They capture the **execution logic** between tasks:

- "Finish the report" must happen **before** "Send report to Aman"
- "Send report" must happen **before** "Meeting at 11"

This creates an execution chain: `Finish report → Send report → Meeting`

This story implements:
1. The `TaskDependency` junction table linking tasks.
2. Circular dependency detection (prevent infinite loops).
3. API endpoints for managing dependencies.
4. Frontend dependency indicators.

---

## Backend Tasks

### 5.1 — Create TaskDependency Model (`models/task_dependency.py`)

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # The task that has a dependency
    task_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("tasks.id", ondelete="CASCADE"), 
        nullable=False
    )
    
    # The task that must be completed first
    depends_on_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("tasks.id", ondelete="CASCADE"), 
        nullable=False
    )
    
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('task_id', 'depends_on_id', name='uq_task_dependency'),
    )
```

### 5.2 — Add Relationships to Task Model

Update `models/task.py`:

```python
from sqlalchemy.orm import relationship

# Add to Task class:

# Tasks that THIS task depends on (prerequisites)
dependencies = relationship(
    "Task",
    secondary="task_dependencies",
    primaryjoin="Task.id == TaskDependency.task_id",
    secondaryjoin="Task.id == TaskDependency.depends_on_id",
    backref="dependents",  # Tasks that depend on THIS task
    lazy="selectin"
)
```

### 5.3 — Create Pydantic Schemas (`schemas/dependency.py`)

```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import List, Optional

# --- Request Schemas ---

class DependencyCreate(BaseModel):
    depends_on_id: UUID  # The prerequisite task ID

class BulkDependencyCreate(BaseModel):
    """For AI processing: create multiple dependencies at once."""
    dependencies: List[dict]  # [{ "task_id": "...", "depends_on_id": "..." }]

# --- Response Schemas ---

class DependencyRead(BaseModel):
    id: UUID
    task_id: UUID
    depends_on_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class TaskDependencyInfo(BaseModel):
    """Enriched dependency info with task titles."""
    id: UUID
    task_id: UUID
    task_title: str
    depends_on_id: UUID
    depends_on_title: str
    depends_on_status: str  # To show if prerequisite is done

class DependencyChain(BaseModel):
    """Full execution chain for a task."""
    task_id: UUID
    task_title: str
    chain: List[dict]  # Ordered list of prerequisites
    is_blocked: bool   # True if any prerequisite is not done
    blocked_by: List[dict]  # List of incomplete prerequisites
```

### 5.4 — Create Dependency Service (`services/dependency_service.py`)

```python
from sqlalchemy.orm import Session
from uuid import UUID
from collections import defaultdict, deque
from app.models.task import Task
from app.models.task_dependency import TaskDependency

class DependencyService:

    @staticmethod
    def add_dependency(
        db: Session, 
        user_id: UUID, 
        task_id: UUID, 
        depends_on_id: UUID
    ) -> TaskDependency:
        """Add a dependency: task_id depends on depends_on_id."""
        
        # 1. Validate both tasks exist and belong to user
        task = db.query(Task).filter(
            Task.id == task_id, Task.user_id == user_id
        ).first()
        if not task:
            raise ValueError("Task not found")
        
        prereq = db.query(Task).filter(
            Task.id == depends_on_id, Task.user_id == user_id
        ).first()
        if not prereq:
            raise ValueError("Prerequisite task not found")
        
        # 2. Prevent self-dependency
        if task_id == depends_on_id:
            raise ValueError("A task cannot depend on itself")
        
        # 3. Check for duplicate
        existing = db.query(TaskDependency).filter(
            TaskDependency.task_id == task_id,
            TaskDependency.depends_on_id == depends_on_id
        ).first()
        if existing:
            raise ValueError("This dependency already exists")
        
        # 4. Check for circular dependency
        if DependencyService._would_create_cycle(db, task_id, depends_on_id):
            raise ValueError(
                "Cannot create this dependency: it would create a circular chain"
            )
        
        # 5. Create dependency
        dep = TaskDependency(task_id=task_id, depends_on_id=depends_on_id)
        db.add(dep)
        db.commit()
        db.refresh(dep)
        return dep

    @staticmethod
    def remove_dependency(
        db: Session, 
        user_id: UUID, 
        task_id: UUID, 
        depends_on_id: UUID
    ):
        """Remove a dependency link."""
        dep = db.query(TaskDependency).filter(
            TaskDependency.task_id == task_id,
            TaskDependency.depends_on_id == depends_on_id
        ).first()
        if not dep:
            raise ValueError("Dependency not found")
        db.delete(dep)
        db.commit()

    @staticmethod
    def get_dependencies(
        db: Session, 
        user_id: UUID, 
        task_id: UUID
    ) -> list:
        """Get all tasks that this task depends on (prerequisites)."""
        task = db.query(Task).filter(
            Task.id == task_id, Task.user_id == user_id
        ).first()
        if not task:
            raise ValueError("Task not found")
        return task.dependencies

    @staticmethod
    def get_dependents(
        db: Session, 
        user_id: UUID, 
        task_id: UUID
    ) -> list:
        """Get all tasks that depend on this task."""
        task = db.query(Task).filter(
            Task.id == task_id, Task.user_id == user_id
        ).first()
        if not task:
            raise ValueError("Task not found")
        return task.dependents

    @staticmethod
    def get_dependency_chain(
        db: Session, 
        user_id: UUID, 
        task_id: UUID
    ) -> dict:
        """
        Get the full dependency chain for a task.
        Returns ordered list from first prerequisite to the task itself.
        """
        task = db.query(Task).filter(
            Task.id == task_id, Task.user_id == user_id
        ).first()
        if not task:
            raise ValueError("Task not found")

        # BFS to collect all ancestors
        visited = set()
        chain = []
        queue = deque([task_id])

        while queue:
            current_id = queue.popleft()
            if current_id in visited:
                continue
            visited.add(current_id)

            deps = db.query(TaskDependency).filter(
                TaskDependency.task_id == current_id
            ).all()

            for dep in deps:
                prereq = db.query(Task).filter(
                    Task.id == dep.depends_on_id
                ).first()
                if prereq:
                    chain.append({
                        "id": str(prereq.id),
                        "title": prereq.title,
                        "status": prereq.status.value,
                    })
                    queue.append(prereq.id)

        # Reverse to get execution order (prerequisites first)
        chain.reverse()

        # Check if blocked
        is_blocked = any(
            item["status"] not in ("done",) for item in chain
        )
        blocked_by = [
            item for item in chain if item["status"] not in ("done",)
        ]

        return {
            "task_id": str(task_id),
            "task_title": task.title,
            "chain": chain,
            "is_blocked": is_blocked,
            "blocked_by": blocked_by,
        }

    @staticmethod
    def _would_create_cycle(
        db: Session, 
        task_id: UUID, 
        depends_on_id: UUID
    ) -> bool:
        """
        Check if adding task_id → depends_on_id would create a cycle.
        
        A cycle exists if depends_on_id can reach task_id through
        existing dependencies (i.e., task_id is an ancestor of depends_on_id).
        """
        # DFS from depends_on_id backwards through its dependencies
        visited = set()
        stack = [depends_on_id]

        while stack:
            current = stack.pop()
            if current == task_id:
                return True  # Cycle detected!
            if current in visited:
                continue
            visited.add(current)

            # Get what 'current' depends on
            deps = db.query(TaskDependency).filter(
                TaskDependency.task_id == current
            ).all()
            for dep in deps:
                stack.append(dep.depends_on_id)

        return False
```

### 5.5 — Create Dependency API Endpoints (`api/v1/dependencies.py`)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.dependency import DependencyCreate, DependencyRead, DependencyChain
from app.services.dependency_service import DependencyService

router = APIRouter(prefix="/tasks/{task_id}/dependencies", tags=["Dependencies"])

@router.post("/", response_model=DependencyRead, status_code=201)
def add_dependency(
    task_id: UUID,
    data: DependencyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a dependency: this task depends on another task.
    The prerequisite task must be completed before this task can proceed.
    
    Returns 400 if:
    - Self-dependency
    - Duplicate dependency
    - Circular dependency detected
    """
    try:
        return DependencyService.add_dependency(
            db, current_user.id, task_id, data.depends_on_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{depends_on_id}", status_code=204)
def remove_dependency(
    task_id: UUID,
    depends_on_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a dependency link between two tasks."""
    try:
        DependencyService.remove_dependency(
            db, current_user.id, task_id, depends_on_id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/")
def list_dependencies(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all tasks that this task depends on (its prerequisites)."""
    try:
        deps = DependencyService.get_dependencies(
            db, current_user.id, task_id
        )
        return {"prerequisites": deps}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/chain")
def get_dependency_chain(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the full dependency chain for this task.
    
    Returns the ordered execution path from first prerequisite
    to this task, including blocked status.
    """
    try:
        return DependencyService.get_dependency_chain(
            db, current_user.id, task_id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/dependents")
def list_dependents(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all tasks that depend on this task (what it blocks)."""
    try:
        deps = DependencyService.get_dependents(
            db, current_user.id, task_id
        )
        return {"dependents": deps}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

---

## Frontend Tasks

### 5.6 — Dependency Service (`services/dependencyService.js`)

```javascript
import api from './api';

const dependencyService = {
  addDependency: async (taskId, dependsOnId) => {
    const response = await api.post(
      `/api/v1/tasks/${taskId}/dependencies`,
      { depends_on_id: dependsOnId }
    );
    return response.data;
  },

  removeDependency: async (taskId, dependsOnId) => {
    await api.delete(`/api/v1/tasks/${taskId}/dependencies/${dependsOnId}`);
  },

  getDependencies: async (taskId) => {
    const response = await api.get(`/api/v1/tasks/${taskId}/dependencies`);
    return response.data;
  },

  getDependencyChain: async (taskId) => {
    const response = await api.get(`/api/v1/tasks/${taskId}/dependencies/chain`);
    return response.data;
  },

  getDependents: async (taskId) => {
    const response = await api.get(`/api/v1/tasks/${taskId}/dependencies/dependents`);
    return response.data;
  },
};

export default dependencyService;
```

### 5.7 — Dependency Indicator on Task Card

Update `TaskCard.jsx` to show dependency info:

- **Blocked indicator**: If task has incomplete prerequisites, show a 🔒 icon with tooltip:  
  *"Blocked by: Finish report, Review logs"*
- **Dependency count badge**: Small number showing `depends on N tasks`
- **Unblocked indicator**: If all prerequisites are done, show ✅ *"Ready to work"*

### 5.8 — Add Dependency Modal (`components/AddDependencyModal.jsx`)

**Design:**
- Search box to find tasks by title
- List of matching tasks with select buttons
- Already-added dependencies shown as removable tags
- Error display if circular dependency is detected
- Clear feedback: "Task A will wait for Task B to complete"

### 5.9 — Dependency Section in Task Detail

Update `TaskDetail.jsx` to include:

**Prerequisites section:**
- List of tasks this task depends on
- Each shows: title, status (done/not done)
- "Add prerequisite" button → opens AddDependencyModal
- "Remove" button next to each prerequisite

**Blocks section:**
- List of tasks that depend on this task
- Each shows: title, status
- Informational only (managed from the dependent task)

**Execution chain:**
- Button to "View full chain"
- Shows ordered path: `Task A → Task B → This Task → Task D`

---

## Database Tasks

### 5.10 — Generate Migration

```bash
alembic revision --autogenerate -m "create_task_dependencies_table"
alembic upgrade head
```

### 5.11 — Table Structure

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY |
| `task_id` | UUID | FOREIGN KEY → tasks.id ON DELETE CASCADE, NOT NULL |
| `depends_on_id` | UUID | FOREIGN KEY → tasks.id ON DELETE CASCADE, NOT NULL |
| `created_at` | TIMESTAMP | DEFAULT now() |

### 5.12 — Constraints & Indexes

- [ ] UNIQUE constraint on `(task_id, depends_on_id)` — prevent duplicates
- [ ] CHECK constraint: `task_id != depends_on_id` — prevent self-dependency
- [ ] Index on `task_id` — lookup prerequisites of a task
- [ ] Index on `depends_on_id` — lookup what depends on a task
- [ ] ON DELETE CASCADE — if a task is deleted, its dependencies are cleaned up

---

## Acceptance Criteria

- [ ] `POST /tasks/{id}/dependencies` creates a dependency link
- [ ] Self-dependency returns 400 error
- [ ] Duplicate dependency returns 400 error
- [ ] **Circular dependency is detected and returns 400 error**
  - Example: A→B, B→C, attempt C→A → error
- [ ] `DELETE /tasks/{id}/dependencies/{dep_id}` removes the link
- [ ] `GET /tasks/{id}/dependencies` returns prerequisite tasks
- [ ] `GET /tasks/{id}/dependencies/chain` returns full execution chain
- [ ] `GET /tasks/{id}/dependencies/dependents` returns tasks blocked by this one
- [ ] Deleting a task cascades and removes its dependency records
- [ ] Frontend shows blocked/ready indicator on task cards
- [ ] Add dependency modal works with search and error handling

---

## Notes

- Circular dependency detection uses DFS — efficient for small-medium graphs.
- For very large dependency graphs (100+ tasks), consider caching the graph in Redis (Story 16).
- Story 13 (Dependency Engine) will add topological sorting and AI-powered dependency resolution.
- The `ON DELETE CASCADE` ensures no orphan dependency records when tasks are deleted.
