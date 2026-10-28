from datetime import UTC, datetime
from uuid import UUID

from app.models.task import Task, TaskStatus, TaskType
from app.schemas.task import TaskCreate, TaskRead, TaskStats, TaskUpdate
from app.services.time_resolver import TimeResolver
from fastapi import HTTPException
from sqlalchemy.orm import Session


class TaskService:
    @staticmethod
    def create_task(
        db: Session,
        user_id: UUID,
        input_id: UUID,
        data: TaskCreate,
        ai_generated: bool = False,
    ) -> TaskRead:

        task = Task(
            user_id=user_id,
            input_id=input_id,
            title=data.title,
            description=data.description,
            status=data.status,
            priority=data.priority,
            task_type=data.task_type,
            due_at=data.due_at,
            ai_generated=ai_generated,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return TaskRead.model_validate(task)

    @staticmethod
    def create_ai_task(
        db: Session,
        parsed_input: dict,
        user_id: UUID,
        input_id: UUID,
    ) -> list[Task]:
        # Local import avoids a circular import between the two services.
        from app.services.dependency_service import DependencyServices

        resolver = TimeResolver()
        tasks = []
        parsed_tasks = parsed_input["tasks"]

        try:
            # 1. Create all task records first.
            for item in parsed_tasks:
                task_data = TaskCreate(
                    title=item["title"],
                    description="",
                    priority=item["priority"],
                    task_type=TaskType(item["type"]),
                    due_at=resolver.resolve(item.get("due_expression")),
                )

                task = Task(
                    user_id=user_id,
                    input_id=input_id,
                    title=task_data.title,
                    description=task_data.description,
                    status=task_data.status,
                    priority=task_data.priority,
                    task_type=task_data.task_type,
                    due_at=task_data.due_at,
                    ai_generated=True,
                )
                db.add(task)
                tasks.append(task)

            # 2. Flush to generate IDs without committing.
            db.flush()

            # 3. Map task titles to their database records.
            title_to_task = {task.title: task for task in tasks}

            # 4. Resolve and save dependency relationships.
            for item, task in zip(parsed_tasks, tasks):
                for dependency_title in item.get("depends_on_titles", []):
                    prerequisite = title_to_task.get(dependency_title)

                    if prerequisite is None:
                        raise ValueError(
                            f"Dependency task not found: {dependency_title}"
                        )

                    DependencyServices.add_dependency(
                        db=db,
                        user_id=user_id,
                        task_id=task.id,
                        depends_on_id=prerequisite.id,
                        commit=False,
                    )

            # 5. Commit all tasks and dependencies together.
            db.commit()

            for task in tasks:
                db.refresh(task)

            return tasks

        except Exception:
            db.rollback()
            raise

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
    ) -> TaskRead:
        task = TaskService.get_task(db, user_id, task_id)

        if data.status == TaskStatus.DONE:
            from app.services.dependency_service import DependencyServices

            DependencyServices.ensure_prerequisites_complete(db, task.id)

        task.title = data.title
        task.description = data.description
        if data.status is not None:
            if data.status == TaskStatus.DONE and task.status != TaskStatus.DONE:
                task.completed_at = datetime.now(UTC).replace(tzinfo=None)
            elif data.status != TaskStatus.DONE:
                task.completed_at = None
            task.status = data.status
        if data.priority is not None:
            task.priority = data.priority
        if data.task_type is not None:
            task.task_type = data.task_type
        task.due_at = data.due_at
        task.updated_at = datetime.now(UTC)

        db.add(task)
        db.commit()
        db.refresh(task)
        return TaskRead.model_validate(task)

    @staticmethod
    def delete_task(db: Session, user_id: UUID, task_id: UUID) -> Task:
        task = TaskService.get_task(db, user_id, task_id)
        db.delete(task)
        db.commit()
        return task

    @staticmethod
    def get_task_stats(db: Session, user_id: UUID) -> TaskStats:
        tasks = TaskService.get_tasks(db, user_id)
        total = len(tasks)
        by_status = {
            "todo": 0,
            "in_progress": 0,
            "done": 0,
            "cancelled": 0,
        }
        for task in tasks:
            by_status[task.status.value] += 1
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
                and task.due_at < datetime.now(UTC)
            ):
                overdue += 1

        for task in tasks:
            by_priority[task.priority.value] += 1

        return TaskStats(
            total=total,
            by_status=by_status,
            by_priority=by_priority,
            overdue=overdue,
        )
