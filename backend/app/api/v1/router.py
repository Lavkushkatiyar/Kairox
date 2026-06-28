from fastapi import APIRouter
from app.api.v1.task import router as task_router
from app.api.v1 import auth
from app.api.v1.raw_input import router as raw_input_router

router = APIRouter()

router.include_router(task_router)
router.include_router(auth.router)
router.include_router(raw_input_router)