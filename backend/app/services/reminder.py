from sqlalchemy.orm import Session
from app.models.reminder import Reminder
from app.schemas.reminder import * 
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.task import Task
from app.models.reminder import Reminder
from app.services.task_service import TaskService
from fastapi import HTTPException
class ReminderService:

    @staticmethod
    def _get_reminder_of_a_task(db:Session,user_id:UUID,reminder_id:UUID)->Reminder:
        reminder = db.query(Reminder).filter(Reminder.id == reminder_id,Reminder.user_id==user_id).first()
        if not reminder:
            raise HTTPException(status_code=404,detail="Reminder not found")
        return reminder
   
   
    @staticmethod
    def create_reminder(db:Session,user_id:UUID,task_id:UUID,data:ReminderCreate)->Reminder:
        task = TaskService.get_task(db,user_id,task_id)
        reminder = Reminder(
            user_id = user_id,
            task_id = task_id,
            remind_at = data.remind_at,
            reminder_type = data.reminder_type,
            message = data.message
        )
            
        db.add(reminder)
        db.commit()
        db.refresh(reminder)
        return reminder

