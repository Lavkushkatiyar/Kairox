
import enum , uuid
from datetime import datetime
from sqlalchemy import Column , Integer , String , Text , DateTime , Enum , ForeignKey , Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped , mapped_column , relationship
from app.db.base import Base


class ReminderType(str, enum.Enum):
    PRE_EVENT = "pre_event"
    DEADLINE = "deadline"
    FOLLOW_UP = "follow_up"
    
class ReminderStatus(str , enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"
    
    
class Reminder(Base):
    __tablename__ = "reminders"
    id = Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True),ForeignKey("tasks.id",ondelete="Cascade"),nullable=False)
    user_id = Column(UUID(as_uuid=True) , ForeignKey("users.id") , nullable=False)
    reminder_at = Column(DateTime,nullable=False)
    reminder_type = Column(Enum(ReminderType), default=ReminderType.DEADLINE, nullable=False)
    reminder_status = Column(Enum(ReminderStatus),default=ReminderStatus.PENDING)
    message=Column(Text,nullable=False)
    created_at = Column(DateTime,default=datetime.utcnow(),nullable=False)
    sent_at = Column(DateTime,nullable=True)
    task=relationship("Task",back_populates="reminders")
    user = relationship("User",back_populates="reminders")
    