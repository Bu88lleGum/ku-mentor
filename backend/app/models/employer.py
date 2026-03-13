from typing import List, Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.vacancy import Vacancy

class EmployerProfile(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, nullable=False)
    
    company_name: str = Field(index=True)
    industry: str | None = None
    region: str | None = None

    # Связи
    user: "User" = Relationship(back_populates="employer_profile")
    vacancies: List["Vacancy"] = Relationship(back_populates="employer")