from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column
from pgvector.sqlalchemy import Vector

if TYPE_CHECKING:
    from app.models.employer import EmployerProfile
    from app.models.links import VacancySkill
    from app.models.application import Application

class Vacancy(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    employer_id: int = Field(foreign_key="employerprofile.id", nullable=False)
    
    title: str = Field(index=True)
    description: str
    requirements: str | None = None
    location: str | None = None
    salary_range: str | None = None
    is_internship: bool = Field(default=False)
    
    # Вектор для матчинга со студентами
    embedding: list[float] | None = Field(
        sa_column=Column(Vector(384)), default=None
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Связи
    employer: "EmployerProfile" = Relationship(back_populates="vacancies")
    skill_links: List["VacancySkill"] = Relationship(back_populates="vacancy")
    applications: List["Application"] = Relationship(back_populates="vacancy")