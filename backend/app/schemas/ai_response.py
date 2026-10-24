
from pydantic import BaseModel, Field

from app.models.task import TaskPriority, TaskType


class ExtractedTask(BaseModel):
    title: str
    type: TaskType
    priority: TaskPriority
    due_expression: str | None = None
    depends_on_titles: list[str] = Field(default_factory=list)


class AI_TASK_FORMAT(BaseModel):
    tasks: list[ExtractedTask]
