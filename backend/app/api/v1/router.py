from fastapi import APIRouter
from app.api.v1.task import router as task_router
from app.api.v1.auth import router as auth_router
from app.api.v1.raw_input import router as raw_input_router
from app.api.v1.dependency import router as dependency_router

router = APIRouter()

router.include_router(task_router)
router.include_router(auth_router)
router.include_router(raw_input_router)
router.include_router(dependency_router)