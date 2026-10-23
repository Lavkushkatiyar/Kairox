from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.task import TaskPriority, TaskStatus, TaskType


class TaskCreate(BaseModel):
    """Create Task Schema"""

    title: str = Field(..., min_length=1, max_length=255)
    input_id: UUID | None = None
    description: str | None = Field(None, max_length=1000)

    due_at: datetime | None = None

    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    task_type: TaskType = TaskType.ACTION


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None

    due_at: datetime | None = None

    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    sort_order: int | None = None
    task_type: TaskType | None = None


class TaskRead(BaseModel):
    id: UUID
    user_id: UUID
    input_id: UUID | None = None

    title: str
    description: str | None = None

    status: TaskStatus
    priority: TaskPriority
    task_type: TaskType

    due_at: datetime | None = None
    completed_at: datetime | None = None

    sort_order: int

    ai_generated: bool
    ai_confidence: float | None = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: str | None = None

    due_time: datetime | None = None
    completed_at: datetime | None = None

    status: TaskStatus
    priority: TaskPriority
    task_type: TaskType

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskStats(BaseModel):
    total: int
    by_status: dict[str, int]
    by_priority: dict[str, int]
    overdue: int


class TaskList(BaseModel):
    items: list[TaskRead]
    total: int
    page: int
    page_size: int
    has_more: bool
