from app.workers.base_task import CeleryTaskBase
from app.workers.celery_app import celery_app


@celery_app.task(bind=True, base=CeleryTaskBase)
def test_task(self, message: str):
    return {
        "status": "ok",
        "message": f"Received from celery : {message}",
    }

@celery_app.task(bind=True, base=CeleryTaskBase, max_retries=3)
def test_failing_task(self, should_fail: bool = True):
    if should_fail and self.request.retries == 0:
        self.retry(exc=Exception("Task failed"), countdown=5)
    return {"status": "ok", "retries": self.request.retries}
