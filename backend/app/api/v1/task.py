from fastapi import APIRouter , Depends , HTTPException
from uuid import UUID
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.task import TaskCreate , TaskResponse,TaskRead,TaskUpdate
from app.services.task_service import TaskService
from app.models.user import User
from app.api.auth_dependencies import get_current_user
router = APIRouter(prefix="/tasks",tags=["Tasks"])


@router.post("", status_code=201, response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return TaskService.create_task(db=db,user_id=current_user.id, data=task) 


@router.get("", response_model=list[TaskRead])
def get_tasks(db: Session = Depends(get_db) ,current_user: User = Depends(get_current_user)):
    return TaskService.get_tasks(db=db,user_id=current_user.id)


@router.get("/{task_id}")
def get_task(task_id: UUID,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return TaskService.get_task(db=db,user_id=current_user.id,task_id=task_id)

@router.patch("/{task_id}",response_model=TaskResponse)
def updated_task(task_id: UUID, payload: TaskUpdate,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return TaskService.updated_task(db=db,user_id=current_user.id,task_id=task_id,data=payload)
