from pydantic import BaseModel
from datetime import datetime
from app.models.enums import ApplicationStatus

class ApplicationBase(BaseModel):
    vacancy_id: int
    cover_letter: str | None = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationRead(ApplicationBase):
    id: int
    student_id: int
    status: str = ApplicationStatus.PENDING
    match_score: float
    created_at: datetime

    class Config:
        from_attributes = True