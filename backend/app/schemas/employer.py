from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional

# 1. Краткая схема вакансии, которую привяжем к работодателю
class EmployerVacancyRead(BaseModel):
    id: int
    title: str
    description: str
    location: Optional[str] = None
    salary_range: Optional[str] = None
    is_internship: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# 2. Итоговая схема ответа: данные профиля + список его вакансий
class EmployerFullInfoResponse(BaseModel):
    id: int  # ID профиля работодателя
    user_id: int
    company_name: str
    industry: Optional[str] = None
    region: Optional[str] = None
    
    vacancies: List[EmployerVacancyRead] = []

    model_config = ConfigDict(from_attributes=True)