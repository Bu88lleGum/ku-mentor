from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, UniqueConstraint, text

class FavouriteVacancy(SQLModel, table=True):
    __tablename__ = "favouritevacancies"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE", nullable=False)
    vacancy_id: int = Field(foreign_key="vacancy.id", ondelete="CASCADE", nullable=False)
    
    # Исправленный синтаксис для передачи DEFAULT NOW() в SQLModel
    created_at: datetime = Field(
        sa_column=Column(DateTime, server_default=text("NOW()"), nullable=False)
    )
    
    __table_args__ = (
        UniqueConstraint("user_id", "vacancy_id", name="uq_user_vacancy"),
    )

    # Связи (без кавычек у типов, если они импортированы, либо в кавычках для TYPE_CHECKING)
    # Если связи пока вызывают ошибки циклического импорта, их можно временно закомментировать