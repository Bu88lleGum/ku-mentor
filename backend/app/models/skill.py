from typing import List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.links import StudentSkill, VacancySkill

class Skill(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    category: str | None = Field(default=None, index=True) # Например: 'Hard Skills', 'Soft Skills'

    # Связи
    student_links: List["StudentSkill"] = Relationship(back_populates="skill")
    vacancy_links: List["VacancySkill"] = Relationship(back_populates="skill")