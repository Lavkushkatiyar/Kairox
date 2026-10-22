from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class RawInputCreate(BaseModel):
    text: str
    source: str | None = "manual"


class RawInputResponse(BaseModel):
    id: UUID
    text: str
    status: str
    source: str
    error_message: str | None = None
    created_at: datetime
    processed_at: datetime | None = None

    class Config:
        from_attributes = True


class RawInputStatusUpdate(BaseModel):
    status: str
    error_message: str | None = None
