from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column
from pgvector.sqlalchemy import Vector

if TYPE_CHECKING:
    from app.models.user import User

class SearchHistory(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    
    # Связь с пользователем (согласно схеме FK userID)
    user_id: int = Field(foreign_key="user.id", nullable=False, index=True)
    
    query_text: str = Field(description="Текстовый запрос пользователя")
    
    # Векторное представление запроса для семантического поиска
    query_embedding: list[float] | None = Field(
        sa_column=Column(Vector(384)), 
        default=None
    )
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Обратная связь
    user: "User" = Relationship(back_populates="search_history")