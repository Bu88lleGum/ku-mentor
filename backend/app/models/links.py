from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, UniqueConstraint
from app.models.enums import CourseStatus
import sqlalchemy as sa


if TYPE_CHECKING:
    from app.models.student import StudentProfile
    from app.models.course import Course
    from app.models.skill import Skill
    from app.models.vacancy import Vacancy


class CourseCategory(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("course_id", "category_id"),) # Запрещает дубликаты пар
    # Твой суррогатный первичный ключ
    id: int | None = Field(default=None, primary_key=True) 
    
    # Это просто внешние ключи, они НЕ являются первичными
    course_id: int = Field(foreign_key="course.id", nullable=False)
    category_id: int = Field(foreign_key="category.id", nullable=False)

class StudentSkill(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("student_id", "skill_id"),)
    
    id: int | None = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="studentprofile.id", nullable=False)
    skill_id: int = Field(foreign_key="skill.id", nullable=False)
    
    # Уровень владения (например, от 1 до 5)
    level: int = Field(default=1)

    student: "StudentProfile" = Relationship(back_populates="skills")
    skill: "Skill" = Relationship(back_populates="student_links")

class VacancySkill(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("vacancy_id", "skill_id"),)
    
    id: int | None = Field(default=None, primary_key=True)
    vacancy_id: int = Field(foreign_key="vacancy.id", nullable=False)
    skill_id: int = Field(foreign_key="skill.id", nullable=False)
    
    # Обязателен ли навык для вакансии
    is_required: bool = Field(default=True)

    vacancy: "Vacancy" = Relationship(back_populates="skill_links")
    skill: "Skill" = Relationship(back_populates="vacancy_links")

class StudentCourse(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("student_id", "course_id"),)
    id: int | None = Field(default=None, primary_key=True)
    # Ссылка на профиль студента, а не на абстрактного юзера
    student_id: int = Field(foreign_key="studentprofile.id", nullable=False)
    course_id: int = Field(foreign_key="course.id", nullable=False)
    
    status: CourseStatus = Field(
        default=CourseStatus.INTERESTED,
        sa_column=sa.Column(sa.Enum(CourseStatus))
    )
    added_at: datetime = Field(default_factory=datetime.utcnow)
    
    student: "StudentProfile" = Relationship(back_populates="courses")
    course: "Course" = Relationship(back_populates="student_links")

class StudentCourseRecommendation(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="studentprofile.id", nullable=False)
    course_id: int = Field(foreign_key="course.id", nullable=False)
    
    score: float = Field(description="Оценка релевантности от ИИ")
    reason: str | None = Field(description="Почему ИИ это предложил")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    student: "StudentProfile" = Relationship(back_populates="recommendations")
    course: "Course" = Relationship(back_populates="recommendations")