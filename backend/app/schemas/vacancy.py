from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class VacancyBase(BaseModel):
    title: str
    description: str
    requirements: str
    location: str
    salary_range: Optional[str] = None
    is_internship: bool = False

class VacancyCreate(VacancyBase):
    skill_ids: List[int] = [] # Скиллы, которые требуются для вакансии

class VacancyRead(VacancyBase):
    id: int
    employer_id: int
    created_at: datetime

    class Config:
        from_attributes = True