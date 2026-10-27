from datetime import UTC, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.reminder import ReminderStatus, ReminderType


def validate_future_datetime(value: datetime | None) -> datetime | None:
    if value is not None and value <= datetime.now(UTC):
        raise ValueError("Reminder time must be in the future")
    return value


class ReminderCreate(BaseModel):
    task_id: UUID
    remind_at: datetime
    reminder_type: ReminderType = ReminderType.DEADLINE
    message: str | None = None

    @field_validator("remind_at")
    @classmethod
    def validate_remind_at(cls, value: datetime) -> datetime:
        return validate_future_datetime(value)


class ReminderUpdate(BaseModel):
    remind_at: datetime | None = None
    reminder_type: ReminderType | None = None
    message: str | None = None
    status: ReminderStatus | None = None

    @field_validator("remind_at")
    @classmethod
    def validate_remind_at(cls, value: datetime) -> datetime:
        return validate_future_datetime(value)


class AutoReminderCreate(BaseModel):
    task_id: UUID
    minutes_before: int = 30
    reminder_type: ReminderType = ReminderType.PRE_EVENT


class ReminderRead(BaseModel):
    id: UUID
    task_id: UUID
    user_id: UUID
    remind_at: datetime
    reminder_type: ReminderType
    status: ReminderStatus
    message: str | None
    created_at: datetime
    sent_at: datetime | None

    task_title: str | None = None
    task_due_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ReminderList(BaseModel):
    items: list[ReminderRead]
    total: int
    upcoming_count: int


class ReminderStats(BaseModel):
    total: int
    upcoming: int
    today: int
    missed: int
