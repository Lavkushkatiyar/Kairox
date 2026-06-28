
from fastapi import APIRouter
from fastapi import HTTPException ,Depends
from app.services.raw_input_service import RawInputServices



router = APIRouter(prefix="/inputs",tags=["Raw Inputs"])


@router.post("",response_model= RawInputResponse,status_code=201)
def create_input(data: RawInputCreate,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return RawInputServices.create_input(db=db,user_id = current_user.id,data=data)

@router.get("",response_model= list[RawInputResponse])
def get_inputs(db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return RawInputServices.get_inputs(db=db,user_id = current_user.id)