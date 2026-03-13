from typing import List, Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.links import StudentCourse, StudentCourseRecommendation, StudentSkill
    from app.models.application import Application

class StudentProfile(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, nullable=False)
    gpa: float | None = None
    interests: List[str] | None = Field(
        default=None,
        sa_column=sa.Column(postgresql.ARRAY(sa.String))
    )
    interests_embedding: List[float] | None = Field(
        sa_column=sa.Column(Vector(384)), default=None
    )
    # СВЯЗИ
    user: "User" = Relationship(back_populates="student_profile")
    skills: List["StudentSkill"] = Relationship(back_populates="student")
    applications: List["Application"] = Relationship(back_populates="student")
    
    # Теперь курсы привязаны к СТУДЕНТУ
    courses: List["StudentCourse"] = Relationship(back_populates="student")
    recommendations: List["StudentCourseRecommendation"] = Relationship(back_populates="student")