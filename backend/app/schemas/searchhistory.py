from pydantic import BaseModel
from datetime import datetime

class SearchHistoryCreate(BaseModel):
    query_text: str

class SearchHistoryRead(BaseModel):
    id: int
    query_text: str
    created_at: datetime

    class Config:
        from_attributes = True