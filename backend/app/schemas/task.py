from pydantic import BaseModel,Field
from datetime import datetime
from typing import Optional 
from app.models.task import Task,TaskPriority,TaskStatus,TaskType
from uuid import uuid4,UUID
from typing import List

class TaskCreate(BaseModel):
    """Create Task Schema"""
    title: str = Field(...,min_length=1,max_length=255)
    input_id: Optional[UUID] = None
    description: Optional[str] = Field(None,max_length=1000)

    due_at: Optional[datetime] = None

    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    task_type: TaskType = TaskType.ACTION

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None,min_length=1,max_length=255)
    description: Optional[str] = None

    due_at: Optional[datetime] = None

    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    sort_order:Optional[int] = None
    task_type: Optional[TaskType] = None


class TaskRead(BaseModel):
    id: UUID
    user_id: UUID
    input_id: Optional[UUID] = None

    title: str
    description: Optional[str] = None

    status: TaskStatus
    priority: TaskPriority
    task_type: TaskType

    due_at: Optional[datetime]=None
    completed_at: Optional[datetime]=None

    sort_order: int

    ai_generated: bool
    ai_confidence: Optional[float]=None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] =None

    due_time: Optional[datetime]=None
    completed_at: Optional[datetime]=None

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
    items: List[TaskRead]
    total: int
    page: int
    page_size: int
    has_more: bool