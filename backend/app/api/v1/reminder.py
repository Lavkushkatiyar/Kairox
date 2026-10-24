from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.auth_dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.reminder import ReminderCreate, ReminderRead, ReminderUpdate
from app.services.reminder import ReminderService

router = APIRouter(prefix="/task/{task_id}/reminders", tags=["Reminders"])


@router.post("/", response_model=ReminderRead)
def create_reminder(
    task_id: UUID,
    data: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ReminderService.create_reminder(db, current_user.id, task_id, data)


@router.get("/", response_model=list[ReminderRead])
def get_reminders(
    task_id: UUID,
    upcoming_only: bool = Query(default=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ReminderService.get_reminders(db, current_user.id, task_id, upcoming_only)


@router.patch("/{reminder_id}", response_model=ReminderRead)
def update_reminder(
    reminder_id: UUID,
    reminder_data: ReminderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ReminderService.update_reminder(
        db=db,
        user_id=current_user.id,
        reminder_id=reminder_id,
        data=reminder_data,
    )


@router.delete("/{reminder_id}", response_model=ReminderRead)
def delete_reminder(
    reminder_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ReminderService.delete_reminder(
        db=db,
        user_id=current_user.id,
        reminder_id=reminder_id,
    )
