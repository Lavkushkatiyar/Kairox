from uuid import UUID

from app.models.raw_input import InputStatus
from app.models.task import Task
from app.schemas.task import TaskRead
from app.api.auth_dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.raw_input import RawInputCreate, RawInputResponse
from app.services.raw_input_service import RawInputService
from app.workers.tasks.process_input import process_rawInput
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/inputs", tags=["Raw Inputs"])


@router.post("", response_model=RawInputResponse, status_code=201)
def create_input(
    payload: RawInputCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raw_input = RawInputService.create_input(
        db=db, user_id=current_user.id, payload=payload
    )
    process_rawInput.delay(
        str(raw_input.id),
        str(current_user.id),
    )
    return raw_input


@router.get("", response_model=list[RawInputResponse])
def get_inputs(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return RawInputService.get_inputs(db=db, user_id=current_user.id)


@router.get("/{input_id}/result")
def get_input_result(
    input_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raw_input = RawInputService.get_input_by_id(
        db=db,
        user_id=current_user.id,
        input_id=input_id,
    )

    if raw_input is None:
        raise HTTPException(status_code=404, detail="Input not found")

    if raw_input.status == InputStatus.PENDING:
        return {"status": "pending", "message": "Waiting in queue"}

    if raw_input.status == InputStatus.PROCESSING:
        return {"status": "processing", "message": "Being processed"}

    if raw_input.status == InputStatus.FAILED:
        return {
            "status": "failed",
            "error": raw_input.error_message,
        }

    tasks = db.query(Task).filter(Task.input_id == input_id).all()

    return {
        "status": "completed",
        "tasks": [TaskRead.model_validate(task) for task in tasks],
        "processed_at": raw_input.processed_at,
    }
