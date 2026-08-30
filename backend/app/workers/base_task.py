from celery import Task 
from app.db.session import SessionLocal

import logging

logger = logging.getLogger(__name__)

class KarioxTask(Task):
    """Base task for the Kairox """
    _db = None
    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
        
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(
            f"Task {self.name}[{task_id}] failed: {exc}",
            extra={"task_id": task_id, "task_args": args}
        )
        
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        logger.warning(
            f"Task {self.name}[{task_id}] retrying: {exc}",
            extra={
                "task_id": task_id,
                "retry_count": self.request.retries,
            },
    )