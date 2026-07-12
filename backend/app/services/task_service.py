from uuid import UUID
from app.schemas.task import TaskCreate
from sqlalchemy.orm import Session
from app.models.task import Task
class TaskService:
    @staticmethod
    def create_task(db:Session,user_id:UUID,data:TaskCreate) -> Task:
        task = Task(
            user_id = user_id,
            input_id = data.input_id,
            title = data.title,
            description= data.description,
            status = data.status,
            priority = data.priority,
            task_type = data.task_type,
            due_at= data.due_at
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task
    
    @staticmethod
    def get_task(   db: Session,user_id: UUID,task_id: UUID) -> list[Task]:
     
        return db.query(Task).filter(Task.user_id == user_id,Task.id == task_id).all()
        