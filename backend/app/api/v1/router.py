from fastapi import APIRouter
from app.api.v1.task import router as task_router

router = APIRouter()

router.include_router(task_router)