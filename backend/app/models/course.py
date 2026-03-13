from typing import List, Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column
from pgvector.sqlalchemy import Vector
from app.models.links import CourseCategory
# Импортируем линк-модель строкой, чтобы избежать ада с импортами
if TYPE_CHECKING:
    from app.models.provider import Provider
    from app.models.category import Category
    from app.models.links import StudentCourse, StudentCourseRecommendation

class Course(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    
    # СТРОГО: nullable=False означает, что участие обязательное. 
    # Курс не создастся, если не указать provider_id.
    provider_id: int = Field(foreign_key="provider.id", nullable=False)
    
    title: str = Field(index=True)
    description: str
    sourceUrl: str | None = None
        
    
    # Вектор для поиска
    embedding: list[float] | None = Field(
        sa_column=Column(Vector(384)), default=None
    )

    # Связи
    recommendations: List["StudentCourseRecommendation"] = Relationship(back_populates="course")
    provider: "Provider" = Relationship(back_populates="courses")
    student_links: List["StudentCourse"] = Relationship(back_populates="course")
    categories: List["Category"] = Relationship(
        back_populates="courses", 
        link_model=CourseCategory # Ссылка на класс в links.py
    )