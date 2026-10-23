import logging
from uuid import UUID

from app.core.config import settings
from app.models.raw_input import InputStatus, RawInput
from app.workers.base_task import CeleryTaskBase
from app.workers.celery_app import celery_app
from llm.llm_factory import get_llm

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, base=CeleryTaskBase, name="process_input")
def process_rawInput(self, input_id: str):

    input_uuid = UUID(input_id)
    db = self.db
    raw_input = db.query(RawInput).filter(RawInput.id == input_uuid).first()
    llm = get_llm(
        provider="ollama",
        model=settings.MODEL,
        API_KEY=" ",
        API_URL=settings.API_URL,
    )

    parsed_output = llm.generate_response(raw_input.text)

    logger.info("AI call finished for input %s", input_id)
    logger.info("AI output: %s", parsed_output)

    if raw_input is None:
        logger.error("Input %s not found", input_id)
        return {"status": "not_found", "input_id": input_id}
    raw_input.status = InputStatus.PROCESSING
    db.commit()
    logger.info("Input %s marked as processing", input_id)

    return {"status": "processing", "input_id": input_id}
