from sqlalchemy.orm import Session
from uuid import UUID
from app.models import Task , TaskDependency
from fastapi import HTTPException

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

    def get_dependency(db:Session,task_id:UUID):
        return db.query(TaskDependency).filter(TaskDependency.task_id == task_id).all()

        