from app.workers.celery_app import celery_app
import time

@celery_app.task
def test_task(message: str):
    time.sleep(10)
    return {
        "status": "ok",
        "message": f"Received from celery : {message}"
    }