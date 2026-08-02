from fastapi import APIRouter , Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from uuid import UUID
from typing import List
from app.models.user import User
from app.schemas.reminder import ReminderCreate , ReminderRead
from app.services.reminder import ReminderService
from app.api.auth_dependencies import get_current_user


router = APIRouter(prefix="/task/{task_id}/reminders",tags = ["Reminders"])

@router.post("/",response_model=ReminderRead)
def create_reminder(
    task_id: UUID,
    data: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ReminderService.create_reminder(db,current_user.id,task_id,data,data)

    
