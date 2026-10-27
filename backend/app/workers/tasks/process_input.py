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


def _get_raw_input(db, input_uuid):
    return db.query(RawInput).filter(RawInput.id == input_uuid).first()


def _handle_input_not_found(input_id):
    logger.error("Input %s not found", input_id)

    return {
        "status": "not_found",
        "input_id": input_id,
    }


def _mark_input_processing(db, raw_input):
    raw_input.status = InputStatus.PROCESSING
    db.commit()


def _parse_input(raw_text):
    llm = llm = get_llm(
    provider="openrouter",
    model="nvidia/nemotron-3.5-lightning:free",
    API_KEY=settings.API_KEY,
    API_URL="https://openrouter.ai/api/v1/chat/completions",
)

    return llm.createTaskFromRawInput(raw_text)


def _create_tasks(db, parsed_output, user_uuid, input_uuid):
    return TaskService.create_ai_task(
        db=db,
        parsed_input=parsed_output,
        user_id=user_uuid,
        input_id=input_uuid,
    )


def _mark_input_completed(db, raw_input):
    raw_input.status = InputStatus.COMPLETED
    raw_input.processed_at = datetime.utcnow()
    db.commit()


def _build_success_response(input_id, tasks):
    logger.info(
        "Created %s tasks for input %s",
        len(tasks),
        input_id,
    )

    return {
        "status": "completed",
        "input_id": input_id,
        "task_count": len(tasks),
    }


def _handle_processing_failure(db, input_uuid, input_id):
    logger.exception("Processing failed for input %s", input_id)
    db.rollback()

    try:
        raw_input = _get_raw_input(db, input_uuid)

        if raw_input is not None:
            raw_input.status = InputStatus.FAILED
            raw_input.error_message = "Input processing failed."
            db.commit()

    except Exception:
        db.rollback()
        logger.exception(
            "Could not save failure status for input %s",
            input_id,
        )


@celery_app.task(bind=True, base=CeleryTaskBase, name="process_input")
def process_rawInput(self, input_id: str, user_id: str):
    db = self.db
    input_uuid = UUID(input_id)
    user_uuid = UUID(user_id)

    raw_input = _get_raw_input(db, input_uuid)

    if raw_input is None:
        return _handle_input_not_found(input_id)

    try:
        _mark_input_processing(db, raw_input)

        parsed_output = _parse_input(raw_input.text)

        tasks = _create_tasks(
            db=db,
            parsed_output=parsed_output,
            user_uuid=user_uuid,
            input_uuid=input_uuid,
        )

        _mark_input_completed(db, raw_input)

        return _build_success_response(input_id, tasks)

    except Exception:
        _handle_processing_failure(db, input_uuid, input_id)
        raise
