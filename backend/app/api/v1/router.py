from fastapi import APIRouter
from app.api.v1.task import router as task_router
from app.api.v1 import auth

router = APIRouter()

router.include_router(task_router)
router.include_router(auth.router)