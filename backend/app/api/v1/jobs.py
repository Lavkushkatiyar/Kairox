from app.api.auth_dependencies import get_current_user
from app.models.user import User
from app.workers.celery_app import celery_app
from fastapi import APIRouter, Depends

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/{job_id}/status")
def get_job_status(job_id: str, current_user: User = Depends(get_current_user)):
    result = celery_app.AsyncResult(job_id)
    response = {"job_id": job_id, "status": result.state, "ready": result.ready()}
    if result.ready():
        if result.successful():
            response["result"] = result.result
        else:
            response["error"] = str(result.result)

    return response


@router.post("/test")
def trigger_test_job(message: str = "Hello Kairox"):
    """Trigger a test job for verifying worker setup."""
    from app.workers.tasks.test_task import test_task

    result = test_task.delay(message)

    return {
        "job_id": result.id,
        "status": "queued",
    }
