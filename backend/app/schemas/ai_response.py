from app.models.task import TaskPriority, TaskType
from pydantic import BaseModel, Field


class ExtractedTask(BaseModel):
    title: str
    type: TaskType
    priority: TaskPriority
    due_expression: str | None = None
    depends_on_titles: list[str] = Field(default_factory=list)


class AI_TASK_FORMAT(BaseModel):
    tasks: list[ExtractedTask]
