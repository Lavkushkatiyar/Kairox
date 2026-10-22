from datetime import datetime
from uuid import UUID

from app.schemas.task import Task, TaskCreate, TaskStatus, TaskUpdate
from fastapi import HTTPException
from sqlalchemy.orm import Session


class TaskService:
    @staticmethod
    def create_task(db: Session, user_id: UUID, data: TaskCreate) -> Task:
        task = Task(
            user_id=user_id,
            input_id=data.input_id,
            title=data.title,
            description=data.description,
            status=data.status,
            priority=data.priority,
            task_type=data.task_type,
            due_at=data.due_at,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def get_tasks(db: Session, user_id: UUID) -> list[Task]:
        return db.query(Task).filter(Task.user_id == user_id).all()

    @staticmethod
    def get_task(db: Session, user_id: UUID, task_id: UUID) -> Task:
        task = (
            db.query(Task).filter(Task.user_id == user_id, Task.id == task_id).first()
        )
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task

    @staticmethod
    def updated_task(
        db: Session, user_id: UUID, task_id: UUID, data: TaskUpdate
    ) -> Task:
        task = TaskService.get_task(db, user_id, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
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

    def delete_task(db: Session, user_id: UUID, task_id: UUID) -> Task:
        task = TaskService.get_task(db, user_id, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        db.delete(task)
        db.commit()
        return task

    def get_task_stats(db: Session, user_id: UUID):
        tasks = TaskService.get_tasks(db, user_id)
        total = len(tasks)
        by_status = {
            "todo": 0,
            "in_progress": 0,
            "done": 0,
            "cancelled": 0,
        }
        for task in tasks:
            by_status[task.status] += 1

        return {"total": total, "by_status": by_status}
        by_priority = {
            "low": 0,
            "medium": 0,
            "high": 0,
            "critical": 0,
        }
        overdue = 0
        for task in tasks:
            if (
                task.due_at is not None
                and task.status != TaskStatus.DONE
                and task.due_at < datetime.utcnow()
            ):
                overdue += 1

        for task in tasks:
            by_priority[task.priority] += 1

        return TaskStats(
            total=total,
            by_status=by_status,
            by_priority=by_priority,
            overdue=overdue,
        )
