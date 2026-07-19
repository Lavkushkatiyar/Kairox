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
from app.models import TaskDependency

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
    return DependencyServices.get_dependency(db=db,task_id=task_id)