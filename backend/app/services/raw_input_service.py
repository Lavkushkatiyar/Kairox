from uuid import UUID

from app.models.raw_input import RawInput
from app.models.task import Task
from app.schemas.raw_input import RawInputCreate
from sqlalchemy import delete
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
    def delete_input(db: Session, user_id: UUID, input_id: UUID) -> dict:
        raw_input = (
            db.query(RawInput)
            .filter(
                RawInput.user_id == user_id,
                RawInput.id == input_id,
            )
            .first()
        )

        if raw_input is None:
            return {"message": "Record not found"}
        tasks = db.query(Task).filter(Task.input_id == input_id).all()
        # Delete all tasks associated with this input in one query.
        db.execute(delete(Task).where(Task.input_id == input_id))

        # Delete the input record.
        db.delete(raw_input)

        db.commit()

        return {"Raw input": f"{raw_input} deleted", "tasks": f"{tasks} deleted"}

    @staticmethod
    def get_input_by_id(db: Session, user_id: UUID, input_id: UUID) -> RawInput:
        return (
            db.query(RawInput)
            .filter(RawInput.user_id == user_id, RawInput.id == input_id)
            .first()
        )
