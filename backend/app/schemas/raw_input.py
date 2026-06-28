from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class RawInputCreate(BaseModel):
    text: str
    source: Optional[str] = "manual"


class RawInputResponse(BaseModel):
    id: UUID
    text: str
    status: str
    source: str
    error_message: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RawInputStatusUpdate(BaseModel):
    status: str
    error_message: Optional[str] = None