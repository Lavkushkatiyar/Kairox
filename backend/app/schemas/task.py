from pydantic import BaseModel,Field
from datetime import datetime
from typing import Optional 
from app.models.task import Task,TaskPriority,TaskStatus,TaskType
from uuid import uuid4,UUID

class TaskCreate(BaseModel):
    """Create Task Schema"""
    title: str = Field(...,min_length=1,max_length=255)
    description: Optional[str] = Field(None,max_length=1000)

    due_time: Optional[datetime] = None

    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    task_type: TaskType = TaskType.ACTION

class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]

    due_time: Optional[datetime]
    completed_at: Optional[datetime]

    status: TaskStatus
    priority: TaskPriority
    task_type: TaskType

    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True