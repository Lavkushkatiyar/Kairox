from typing import Optional

from pydantic import BaseModel
from enum import Enum

class TaskType(str, Enum):
    TODO = "todo"
    MEETING = "meeting"
    APPOINTMENT = "appointment"
    REMINDER = "reminder"

class TaskPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class ExtractedTask(BaseModel):
    title: str
    type: TaskType
    priority: TaskPriority
    due_expression: Optional[str] = None


class ParsedOutput(BaseModel):
    tasks: list[ExtractedTask]