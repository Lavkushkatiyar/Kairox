from fastapi import APIRouter , Depends
# from typing import List
from sqlalchemy.orm import Session
from app.db.session import get_db
from uuid import UUID
from app.models.user import User
from app.api.auth_dependencies import get_current_user
from app.schemas.dependency import DependencyCreate, DependencyRead
from app.services.dependency_service import DependencyServices
from fastapi import HTTPException
from app.models import TaskDependency ,Task
from app.schemas.task import TaskRead

router =  APIRouter(prefix="/task/{task_id}/dependencies",tags = ["Dependencies"])

@router.post("/", response_model=DependencyRead, status_code=201)
def add_dependency(
    task_id: UUID,
    data: DependencyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DependencyServices.add_dependency(
        db=db,
        user_id=current_user.id,
        task_id=task_id,
        depends_on_id=data.depends_on_id,
    )
@router.get("/", response_model=list[DependencyRead], status_code=201)
def get_dependency(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DependencyServices.get_task_dependency(db=db,task_id=task_id)

@router.delete("/",response_model=DependencyRead, status_code=200)
def delete_dependency(task_id:UUID,dependency_id:UUID,db:Session=Depends(get_db)):
    return DependencyServices.remove_dependency(db=db,task_id=task_id,dependency_id=dependency_id)

@router.get("/chain")
def get_dependency_chain(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DependencyServices.get_task_dependency_chain(
    db=db,
    task_id=task_id,
    user_id=current_user.id
)

@router.get("/dependents",response_model=list[TaskRead])
def get_dependents(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DependencyServices.get_dependents(db=db,task_id=task_id,user_id=current_user.id)