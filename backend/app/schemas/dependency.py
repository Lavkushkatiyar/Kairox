from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class DependencyCreate:
    task_id:UUID
    depends_on_id:UUID

class DependencyRead: 
    id: UUID
    task_id: UUID
    depends_on_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
    
class TaskDependencyInfo:
    id:UUID
    title:str
    status:str
    priority:str
    
class DependencyChain:
    task_id:UUID
    dependencies:list[TaskDependencyInfo]
    