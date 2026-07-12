from app.db.base import Base
from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint,CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid


class TaskDependency(Base):
    __tablename__ = "task_dependencies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True),ForeignKey("tasks.id",ondelete="CASCADE"),nullable=False)
    depends_on_id = Column(UUID(as_uuid=True),ForeignKey("tasks.id",ondelete="CASCADE"),nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint('task_id', 'depends_on_id', name='uq_task_dependency'),CheckConstraint("task_id <> depends_on_id",name="ck_task_not_self"))