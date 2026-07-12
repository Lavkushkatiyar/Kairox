from fastapi import APIRouter , Depends , HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.task import TaskCreate , TaskResponse,TaskRead
from app.models.task import Task
from app.services.task_service import TaskService
from app.services.auth_service import AuthService
from app.models.user import User
router = APIRouter(prefix="/tasks",tags=["Tasks"])


@router.post("", status_code=201, response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db),current_user: User = Depends(AuthService.get_current_user)):
    return TaskService.create_task(db=db,user_id=current_user.id, data=task) 


@router.get("", response_model=list[TaskRead])
def get_tasks(db: Session = Depends(get_db) ,current_user: User = Depends(AuthService.get_current_user)):
    return TaskService.get_task(db=db,user_id=current_user.id)