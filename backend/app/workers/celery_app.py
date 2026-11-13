
import ssl

from app.core.config import settings
from celery import Celery

celery_app = Celery("Kairox")

redis_url = settings.REDIS_URL

if not redis_url:
    raise ValueError("REDIS_URL is not configured")

celery_app.conf.update(
    broker_url=redis_url,
    result_backend=redis_url,

    # Upstash TLS configuration
    broker_use_ssl={
        "ssl_cert_reqs": ssl.CERT_REQUIRED,
    },

    redis_backend_use_ssl={
        "ssl_cert_reqs": ssl.CERT_REQUIRED,
    },

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

    broker_connection_retry_on_startup=True,
)

celery_app.autodiscover_tasks(["app.workers.tasks"])

celery_app.conf.imports = (
    "app.workers.tasks.test_task",
    "app.workers.tasks.process_input",
)
