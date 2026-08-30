
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth_dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.raw_input import RawInputCreate,RawInputResponse
from app.services.raw_input_service import RawInputService

router = APIRouter(prefix="/inputs",tags=["Raw Inputs"])

@router.post("",response_model= RawInputResponse,status_code=201)
def create_input(payload: RawInputCreate,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return RawInputService.create_input(db=db,user_id = current_user.id,payload=payload)

@router.get("",response_model= list[RawInputResponse])
def get_inputs(db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return RawInputService.get_inputs(db=db,user_id = current_user.id)