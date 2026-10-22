from app.api.v1.auth import router as auth_router
from app.api.v1.dependency import router as dependency_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.raw_input import router as raw_input_router
from app.api.v1.reminder import router as reminder_router
from app.api.v1.task import router as task_router
from fastapi import APIRouter

router = APIRouter()

router.include_router(auth_router)
router.include_router(raw_input_router)
router.include_router(task_router)
router.include_router(dependency_router)
router.include_router(reminder_router)
router.include_router(jobs_router)
