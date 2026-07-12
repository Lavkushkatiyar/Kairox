from datetime import datetime
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
    def get_tasks(db: Session,user_id: UUID) -> list[Task]:
        return db.query(Task).filter(Task.user_id == user_id).all()
    
    @staticmethod
    def get_task(db: Session,user_id: UUID,task_id: UUID) -> Task:
        return db.query(Task).filter(Task.user_id == user_id,Task.id == task_id).first()
    @staticmethod 
    def updated_task(db:Session,user_id:UUID,task_id:UUID,data:TaskUpdate) -> Task:
        task = TaskService.get_task(db,user_id,task_id)
        if not task:
            raise HTTPException(status_code=404,detail="Task not found")
        task.title = data.title
        task.description = data.description
        task.status = data.status
        task.priority = data.priority
        task.task_type = data.task_type
        task.due_at = data.due_at
        task.updated_at = datetime.utcnow()

        db.add(task)
        db.commit()
        db.refresh(task)
        return task
    
        