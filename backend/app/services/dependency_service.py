from sqlalchemy.orm import Session
from uuid import UUID
from app.models import Task , TaskDependency
from fastapi import HTTPException
from app.services.task_service import TaskService

class DependencyServices:
    @staticmethod
    def add_dependency(
    db: Session,
    user_id: UUID,
    task_id: UUID,
    depends_on_id: UUID,
) -> TaskDependency:
        if task_id == depends_on_id:
            raise HTTPException(
            status_code=400,
            detail="A task cannot depend on itself."
        )

        existing_dependency = (
        db.query(TaskDependency)
        .filter(
            TaskDependency.task_id == task_id,
            TaskDependency.depends_on_id == depends_on_id,
        )
        .first()
    )

        if existing_dependency:
            raise HTTPException(
            status_code=400,
            detail="Dependency already exists."
        )

        dependency = TaskDependency(
        task_id=task_id,
        depends_on_id=depends_on_id,
    )

        db.add(dependency)
        db.commit()
        db.refresh(dependency)
        return dependency
    
    
    @staticmethod
    def get_task_dependency(db:Session,task_id:UUID):
        task = db.query(TaskDependency).filter(TaskDependency.task_id == task_id).all()
        if task is None:
            raise HTTPException(status_code=404,detail="Task not found")
        return task
    

    @staticmethod
    def _collect_dependencies(
        db: Session,
        current_task_id: UUID,
        result: list,
    ):
        dependencies = (
            db.query(TaskDependency)
            .filter(TaskDependency.task_id == current_task_id)
            .all()
        )

        for dependency in dependencies:
            result.append(dependency)
            _collect_dependencies(db,dependency.depends_on_id,result)
            
    
    @staticmethod
    def get_task_dependency_chain(db: Session,task_id: UUID):
        result = []
        DependencyServices._collect_dependencies(db,task_id,result)
        
        return result
    
    @staticmethod
    def get_dependents(db:Session,task_id:UUID,user_id:UUID):
        task =  TaskService.get_task(db=db,user_id=user_id,task_id=task_id)
        if task is None:
            raise HTTPException(status_code=404,detail="Task not found")
        return task.dependents

