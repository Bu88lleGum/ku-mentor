from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class VacancyBase(BaseModel):
    title: str
    description: str
    requirements: str | None = None
    location: str | None = None
    salary_range: Optional[str] = None
    is_internship: bool = False

class VacancyCreate(VacancyBase):
    skill_ids: List[int] = [] # Скиллы, которые требуются для вакансии

class VacancyRead(VacancyBase):
    id: int
    employer_id: int
    created_at: datetime

class VacancyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    skill_ids: Optional[List[int]] = None # Список ID скиллов

    class Config:
        from_attributes = True

    class Config:
        from_attributes = True