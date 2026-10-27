from uuid import uuid4

import pytest
from app.api.auth_dependencies import get_current_user
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Task, TaskDependency, User
from app.models.task import TaskPriority, TaskStatus, TaskType
from app.schemas.task import TaskUpdate
from app.services.task_service import TaskService
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_session = sessionmaker(bind=engine)
    session = test_session()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def create_task(db: Session, user_id, title: str, status=TaskStatus.TODO) -> Task:
    task = Task(
        user_id=user_id,
        title=title,
        description="",
        status=status,
        priority=TaskPriority.MEDIUM,
        task_type=TaskType.ACTION,
    )
    db.add(task)
    db.flush()
    return task


def create_user(db: Session) -> User:
    user = User(
        id=uuid4(),
        email=f"{uuid4()}@example.com",
        hashed_password="not-used",
        full_name="Test User",
    )
    db.add(user)
    db.flush()
    return user


def complete_task(db: Session, user_id, task_id) -> Task:
    return TaskService.updated_task(
        db,
        user_id,
        task_id,
        TaskUpdate(title="Downstream task", description="", status=TaskStatus.DONE),
    )


def test_task_without_prerequisites_can_be_completed(db_session: Session):
    user = create_user(db_session)
    task = create_task(db_session, user.id, "Independent task")
    db_session.commit()

    updated = complete_task(db_session, user.id, task.id)

    assert updated.status == TaskStatus.DONE


def test_task_with_incomplete_prerequisite_is_rejected(db_session: Session):
    user = create_user(db_session)
    prerequisite = create_task(db_session, user.id, "Collect project metrics")
    task = create_task(db_session, user.id, "Analyze project metrics")
    db_session.add(
        TaskDependency(task_id=task.id, depends_on_id=prerequisite.id)
    )
    db_session.commit()

    with pytest.raises(HTTPException) as error:
        complete_task(db_session, user.id, task.id)

    assert error.value.status_code == 409
    assert "Collect project metrics" in error.value.detail
    db_session.refresh(task)
    assert task.status == TaskStatus.TODO


def test_multiple_prerequisites_must_all_be_completed(db_session: Session):
    user = create_user(db_session)
    completed_prerequisite = create_task(
        db_session, user.id, "Gather project metrics", TaskStatus.DONE
    )
    incomplete_prerequisite = create_task(db_session, user.id, "Review project risks")
    second_incomplete_prerequisite = create_task(
        db_session, user.id, "Confirm project scope"
    )
    task = create_task(db_session, user.id, "Prepare project report")
    db_session.add_all(
        [
            TaskDependency(
                task_id=task.id, depends_on_id=completed_prerequisite.id
            ),
            TaskDependency(
                task_id=task.id, depends_on_id=incomplete_prerequisite.id
            ),
            TaskDependency(
                task_id=task.id, depends_on_id=second_incomplete_prerequisite.id
            ),
        ]
    )
    db_session.commit()

    with pytest.raises(HTTPException) as error:
        complete_task(db_session, user.id, task.id)

    assert error.value.status_code == 409
    assert "Review project risks" in error.value.detail
    assert "Confirm project scope" in error.value.detail
    assert "Gather project metrics" not in error.value.detail

    incomplete_prerequisite.status = TaskStatus.DONE
    second_incomplete_prerequisite.status = TaskStatus.DONE
    db_session.commit()
    updated = complete_task(db_session, user.id, task.id)

    assert updated.status == TaskStatus.DONE


def test_task_patch_endpoint_cannot_bypass_prerequisite_check(db_session: Session):
    user = create_user(db_session)
    prerequisite = create_task(db_session, user.id, "Approve the proposal")
    task = create_task(db_session, user.id, "Publish the proposal")
    db_session.add(TaskDependency(task_id=task.id, depends_on_id=prerequisite.id))
    db_session.commit()

    def override_db():
        yield db_session

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        response = TestClient(app).patch(
            f"/api/v1/tasks/{task.id}",
            json={
                "title": task.title,
                "description": task.description,
                "status": TaskStatus.DONE.value,
            },
        )
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 409
    assert "Approve the proposal" in response.json()["detail"]
