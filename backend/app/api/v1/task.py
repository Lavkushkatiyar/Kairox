from fastapi import APIRouter , Depends , HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.task import TaskCreate , TaskResponse
from app.models.task import Task
from app.services.task_service import TaskCreate
router = APIRouter(prefix="/tasks",tags=["Tasks"])


@router.post("", status_code=201, response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    returnTaskCreate.create_task(db=db,user_id=user_id, data=data) 


@router.get("", response_model=list[TaskResponse])
def get_tasks(db: Session = Depends(get_db)):
    tasks = db.query(Task).all()
    return tasks