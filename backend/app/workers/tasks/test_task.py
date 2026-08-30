from app.workers.celery_app import celery_app
from app.workers.base_task import KarioxTask

@celery_app.task(bind = True , base = KarioxTask)
def test_task(self, message: str):
    db = self.db
    return {
        "status": "ok",
        "message": f"Received from celery : {message}",
    }