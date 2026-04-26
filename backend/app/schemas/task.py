from pydantic import BaseModel
from datetime import datetime
from typing import Optional 

class TaskCreate(BaseModel):
    title:str
    description:Optional[str]=None
    due_time: Optional[datetime] = None


    #Ai will give me these later 

    status:Optional[str]=None
    priority:Optional[str]=None

class TaskResponse(BaseModel):
    id:int
    title:str
    description: Optional[str]
    due_time: Optional[datetime]
    status:str
    priority:str

    class Config:
        from_attributes = True