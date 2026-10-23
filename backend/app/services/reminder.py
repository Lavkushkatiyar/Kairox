from datetime import datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.reminder import Reminder
from app.schemas.reminder import *
from app.services.task_service import TaskService


class ReminderService:
    @staticmethod
    def _get_reminder_of_a_task(
        db: Session, user_id: UUID, reminder_id: UUID
    ) -> Reminder:
        reminder = (
            db.query(Reminder)
            .filter(Reminder.id == reminder_id, Reminder.user_id == user_id)
            .first()
        )
        if not reminder:
            raise HTTPException(status_code=404, detail="Reminder not found")
        return reminder

    @staticmethod
    def create_reminder(
        db: Session, user_id: UUID, task_id: UUID, data: ReminderCreate
    ) -> Reminder:
        task = TaskService.get_task(db, user_id, task_id)
        reminder = Reminder(
            user_id=user_id,
            task_id=task_id,
            remind_at=data.remind_at,
            reminder_type=data.reminder_type,
            message=data.message,
        )

        db.add(reminder)
        db.commit()
        db.refresh(reminder)
        return reminder

    @staticmethod
    def get_reminders(
        db: Session, user_id: UUID, upcoming_only: bool = False, task_id: UUID = None
    ) -> List[ReminderRead]:
        reminders = db.query(Reminder).filter(Reminder.user_id == user_id)

        if task_id:
            reminders = reminders.filter(Reminder.task_id == task_id)

        if upcoming_only:
            reminders = reminders.filter(
                Reminder.status == ReminderStatus.PENDING,
                Reminder.remind_at > datetime.utcnow(),
            ).all()
        return reminders.order_by(Reminder.remind_at.asc()).all()

    @staticmethod
    def update_reminder(
        db: Session, user_id: UUID, reminder_id: UUID, data: ReminderUpdate
    ) -> Reminder:
        reminder = ReminderService._get_reminder_of_a_task(db, user_id, reminder_id)
        reminder.remind_at = data.remind_at
        reminder.reminder_type = data.reminder_type
        reminder.message = data.message
        reminder.status = data.status
        db.commit()
        db.refresh(reminder)
        return reminder

    def delete_reminder(db: Session, user_id: UUID, reminder_id: UUID) -> Reminder:
        reminder = ReminderService._get_reminder_of_a_task(db, user_id, reminder_id)
        db.delete(reminder)
        db.commit()
        return reminder
