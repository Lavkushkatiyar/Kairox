import enum
import uuid
from datetime import datetime

from app.db.base import Base
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


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
    ACTION = "action"
    EVENT = "event"
    COMMUNICATION = "communication"
    REVIEW = "review"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    input_id = Column(
        UUID(as_uuid=True), ForeignKey("raw_inputs.id"), nullable=True, index=True
    )

    title = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        Enum(TaskStatus),
        default=TaskStatus.TODO,
        nullable=False,
    )

    priority = Column(
        Enum(TaskPriority),
        default=TaskPriority.MEDIUM,
        nullable=False,
    )

    task_type = Column(
        Enum(TaskType),
        default=TaskType.ACTION,
        nullable=False,
    )
    due_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    sort_order = Column(Integer, default=0)
    ai_generated = Column(Boolean, default=False)
    ai_confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    user = relationship("User", backref="tasks")
    input = relationship("RawInput", back_populates="tasks")
    dependencies = relationship(
        "Task",
        secondary="task_dependencies",
        primaryjoin="Task.id == TaskDependency.task_id",
        secondaryjoin="Task.id == TaskDependency.depends_on_id",
        backref="dependents",
        lazy="selectin",
    )
    reminders = relationship(
        "Reminder", back_populates="task", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self):
        return f"<Task id={self.id} title={self.title}>"
