from pydantic import BaseModel, computed_field
from datetime import datetime
from app.models.enums import ApplicationStatus

# 1. Минимальная схема работодателя для вакансии
class EmployerShortRead(BaseModel):
    company_name: str

    class Config:
        from_attributes = True

# 2. Минимальная схема вакансии для отклика
class VacancyShortRead(BaseModel):
    id: int
    title: str
    employer: EmployerShortRead | None = None  # Вкладываем работодателя

    class Config:
        from_attributes = True

# 3. Базовая схема отклика
class ApplicationBase(BaseModel):
    vacancy_id: int
    cover_letter: str | None = None

class ApplicationCreate(ApplicationBase):
    pass

# 4. Основная схема чтения отклика (Именно её возвращает эндпоинт /my)
class ApplicationRead(ApplicationBase):
    id: int
    student_id: int
    status: str = ApplicationStatus.PENDING
    match_score: float | None = None # Сделал Optional, так как в модели он nullable
    created_at: datetime
    vacancy: VacancyShortRead | None = None # ПОЛЕ ДЛЯ ДАННЫХ ВАКАНСИИ

    class Config:
        from_attributes = True

class IncomingApplicationRead(BaseModel):
    id: int
    vacancy_id: int
    status: str
    created_at: datetime
    student_name: str
    vacancy_title: str
    cover_letter: str | None = None

    @computed_field
    def cover_letter_preview(self) -> str | None:
        if self.cover_letter and len(self.cover_letter) > 60:
            return f"{self.cover_letter[:60]}..."
        return self.cover_letter

    class Config:
        from_attributes = True

# Схема для получения детальной информации о студенте внутри отклика
class StudentShortProfileRead(BaseModel):
    username: str
    email: str
    gpa: float
    interests: list[str]

    class Config:
        from_attributes = True

# Схема, которую вернет GET /application/{id}
class DetailedApplicationRead(BaseModel):
    id: int
    vacancy_id: int
    vacancy_title: str | None = None
    cover_letter: str | None = None
    status: str
    match_score: float | None = None
    created_at: datetime
    student: StudentShortProfileRead | None = None # Вложенные данные студента

    class Config:
        from_attributes = True

# Схема для входящего PATCH-запроса (изменение статуса)
class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus # Будет автоматически валидировать ACCEPTED, REJECTED и т.д.