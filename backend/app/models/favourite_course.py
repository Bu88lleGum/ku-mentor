from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, UniqueConstraint, text

class FavouriteCourse(SQLModel, table=True):
    __tablename__ = "favouritecourses"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE", nullable=False)
    course_id: int = Field(foreign_key="course.id", ondelete="CASCADE", nullable=False)
    
    # Исправленный синтаксис для передачи DEFAULT NOW() в SQLModel
    created_at: datetime = Field(
        sa_column=Column(DateTime, server_default=text("NOW()"), nullable=False)
    )
    
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_user_course"),
    )