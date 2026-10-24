from collections import deque
from uuid import UUID

from app.models import Task, TaskDependency
from app.services.task_service import TaskService
from fastapi import HTTPException
from sqlalchemy.orm import Session


class DependencyServices:
    @staticmethod
    def _would_create_cycle(db: Session, task_id: UUID, depends_on_id: UUID) -> bool:
        visited = set()
        stack = [depends_on_id]
        while stack:
            current = stack.pop()
            if current == task_id:
                return True
            if current in visited:
                continue
            visited.add(current)
            dependencies = (
                db.query(TaskDependency).filter(TaskDependency.task_id == current).all()
            )
            for dependency in dependencies:
                stack.append(dependency.depends_on_id)
        return False

    @staticmethod
    def add_dependency(
        db: Session,
        user_id: UUID,
        task_id: UUID,
        depends_on_id: UUID,
        commit: bool = True,
    ) -> TaskDependency:
        TaskService.get_task(db, user_id, task_id)
        TaskService.get_task(db, user_id, depends_on_id)

        if task_id == depends_on_id:
            raise HTTPException(
                status_code=400, detail="A task cannot depend on itself."
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
            raise HTTPException(status_code=400, detail="Dependency already exists.")

        if DependencyServices._would_create_cycle(db, task_id, depends_on_id):
            raise HTTPException(
                status_code=400, detail="Adding this dependency would create a cycle."
            )
        dependency = TaskDependency(
            task_id=task_id,
            depends_on_id=depends_on_id,
        )
        db.add(dependency)

        if commit:
            db.commit()
            db.refresh(dependency)
        else:
            db.flush()

        return dependency

    @staticmethod
    def get_task_dependency(db: Session, task_id: UUID, user_id: UUID):
        return db.query(TaskDependency).filter(TaskDependency.task_id == task_id).all()

    @staticmethod
    def build_dependency_response(
        task: Task,
        chain: list[Task],
    ) -> dict:
        chain.reverse()

        chain_data = [
            {
                "id": str(item.id),
                "title": item.title,
                "status": item.status.value,
            }
            for item in chain
        ]

        is_blocked = any(item["status"] != "done" for item in chain_data)

        blocked_by = [item for item in chain_data if item["status"] != "done"]

        return {
            "task_id": str(task.id),
            "task_title": task.title,
            "chain": chain_data,
            "is_blocked": is_blocked,
            "blocked_by": blocked_by,
        }

    @staticmethod
    def get_dependency_chain(db: Session, task_id: UUID) -> list[Task]:

        visited = set()
        chain = []
        queue = deque([task_id])

        while queue:
            current_task_id = queue.popleft()

            if current_task_id in visited:
                continue

            visited.add(current_task_id)

            dependencies = (
                db.query(TaskDependency)
                .filter(TaskDependency.task_id == current_task_id)
                .all()
            )

            for dependency in dependencies:
                prerequisite = (
                    db.query(Task).filter(Task.id == dependency.depends_on_id).first()
                )

                if prerequisite:
                    chain.append(prerequisite)
                    queue.append(prerequisite.id)

        return chain

    @staticmethod
    def get_task_dependency_chain(
        db: Session,
        task_id: UUID,
        user_id: UUID,
    ) -> dict:
        task = TaskService.get_task(db, user_id, task_id)
        chain = DependencyServices.get_dependency_chain(db, task_id)

        return DependencyServices.build_dependency_response(
            task,
            chain,
        )

    @staticmethod
    def get_dependents(db: Session, task_id: UUID, user_id: UUID) -> list[Task]:
        task = TaskService.get_task(db=db, user_id=user_id, task_id=task_id)
        return task.dependents

    @staticmethod
    def remove_dependency(
        db: Session,
        task_id: UUID,
        dependency_id: UUID,
        user_id: UUID,
    ) -> TaskDependency:
        TaskService.get_task(db, user_id, task_id)
        dependency = (
            db.query(TaskDependency)
            .filter(
                TaskDependency.id == dependency_id,
                TaskDependency.task_id == task_id,
            )
            .first()
        )
        if dependency is None:
            raise HTTPException(status_code=404, detail="Dependency not found")

        db.delete(dependency)
        db.commit()
        return dependency
