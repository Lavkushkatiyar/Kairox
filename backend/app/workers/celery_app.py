from celery import Celery

from app.core.config import settings

celery_app = Celery("Kairox")

celery_app.conf.update(
    broker_url=settings.REDIS_URL,
    result_backend=settings.REDIS_URL,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,
    task_default_retry_delay=5,
    task_max_retries=5,
)

celery_app.autodiscover_tasks(["app.workers.tasks"])
celery_app.conf.imports = (
    "app.workers.tasks.test_task",
    "app.workers.tasks.process_input",
)
