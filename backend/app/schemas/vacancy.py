from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Union
from datetime import datetime
from app.schemas.course import CourseRead

class VacancyBase(BaseModel):
    title: str
    description: str
    requirements: str | None = None
    location: str | None = None
    salary_range: Optional[str] = None
    is_internship: bool = False

class VacancyCreate(VacancyBase):
    skill_ids: List[int] = [] # Скиллы, которые требуются для вакансии

# 1. Создаем схему для отображения кратких данных компании
class VacancyEmployerRead(BaseModel):
    company_name: str
    # Сюда можно добавить region или industry, если они понадобятся на фронтенде
    
    model_config = ConfigDict(from_attributes=True)

class VacancyRead(VacancyBase):
    id: int
    employer_id: int
    title: str
    description: str
    requirements: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    is_internship: bool
    created_at: datetime

    employer: VacancyEmployerRead

    model_config = ConfigDict(from_attributes=True)

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

class RecommendationResponse(BaseModel):
    query: str
    results: List[Union[CourseRead, VacancyRead]]

    model_config = ConfigDict(from_attributes=True)