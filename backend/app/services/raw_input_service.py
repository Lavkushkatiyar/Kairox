from uuid import UUID

from app.models.raw_input import RawInput
from app.schemas.raw_input import RawInputCreate
from sqlalchemy.orm import Session


class RawInputService:
    @staticmethod
    def create_input(db: Session, user_id: UUID, payload: RawInputCreate) -> RawInput:
        raw_input = RawInput(user_id=user_id, text=payload.text, source=payload.source)
        db.add(raw_input)
        db.commit()
        db.refresh(raw_input)
        return raw_input

    @staticmethod
    def get_inputs(db: Session, user_id: UUID) -> list[RawInput]:
        return (
            db.query(RawInput)
            .filter(RawInput.user_id == user_id)
            .order_by(RawInput.created_at.desc())
            .all()
        )

    @staticmethod
    def get_input_by_id(db: Session, user_id: UUID, input_id: UUID) -> RawInput:
        return (
            db.query(RawInput)
            .filter(RawInput.user_id == user_id, RawInput.id == input_id)
            .first()
        )
