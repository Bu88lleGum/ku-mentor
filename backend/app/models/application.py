from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from app.models.enums import ApplicationStatus
import sqlalchemy as sa


if TYPE_CHECKING:
    from app.models.student import StudentProfile
    from app.models.vacancy import Vacancy

class Application(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    
    # Ссылки на вакансию и студента (обязательные по схеме ||)
    vacancy_id: int = Field(foreign_key="vacancy.id", nullable=False)
    student_id: int = Field(foreign_key="studentprofile.id", nullable=False)
    
    cover_letter: str | None = Field(default=None)

    status: ApplicationStatus = Field(
        default=ApplicationStatus.PENDING,
        sa_column=sa.Column(sa.Enum(ApplicationStatus))
        ) # Например: pending, accepted, rejected
    
    # Тот самый matchScore с диаграммы для оценки ИИ
    match_score: float | None = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Связи
    student: "StudentProfile" = Relationship(back_populates="applications")
    vacancy: "Vacancy" = Relationship(back_populates="applications")