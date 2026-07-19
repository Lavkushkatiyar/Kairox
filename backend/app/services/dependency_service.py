from sqlalchemy.orm import Session
from uuid import UUID
from app.models import Task , TaskDependency

class DependencyServices:
    @staticmethod
    def add_dependency(db:Session,user_id:UUID,task_id:UUID,depends_on_id:UUID):
        dependency = TaskDependency(task_id = task_id, depends_on_id = depends_on_id)
        db.add(dependency)
        db.commit()
        db.refresh(dependency)
        return dependency
    def get_dependency(db:Session,task_id:UUID):
        return db.query(TaskDependency).filter(TaskDependency.task_id == task_id).all()

        