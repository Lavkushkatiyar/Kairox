import logging
from datetime import datetime
from uuid import UUID

from app.core.config import settings
from app.models.raw_input import InputStatus, RawInput
from app.services.task_service import TaskService
from app.workers.base_task import CeleryTaskBase
from app.workers.celery_app import celery_app
from llm.llm_factory import get_llm

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, base=CeleryTaskBase, name="process_input")
def process_rawInput(self, input_id: str, user_id: UUID):

    input_uuid = UUID(input_id)
    user_uuid = UUID(str(user_id))
    db = self.db

    raw_input = db.query(RawInput).filter(RawInput.id == input_uuid).first()

    if raw_input is None:
        logger.error("Input %s not found", input_id)
        return {"status": "not_found", "input_id": input_id}

    raw_input.status = InputStatus.PROCESSING
    db.commit()

    llm = get_llm(
        provider="ollama",
        model=settings.MODEL,
        API_KEY=" ",
        API_URL=settings.API_URL,
    )

    parsed_output = llm.generate_response(raw_input.text)

    tasks = TaskService.create_ai_task(
        db=db,
        parsed_input=parsed_output,
        user_id=user_uuid,
        input_id=input_uuid,
    )

    logger.info(
        "Created %s tasks for input %s",
        len(tasks),
        input_id,
    )

    raw_input.status = InputStatus.COMPLETED
    raw_input.processed_at = datetime.utcnow()
    db.commit()

    return {
        "status": "completed",
        "input_id": input_id,
        "task_count": len(tasks),
    }
