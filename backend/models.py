from datetime import datetime
from typing import List
from sqlmodel import SQLModel, Field, Relationship, Column
from pgvector.sqlalchemy import Vector
import sqlalchemy as sa
from enum import Enum

# 1. Основная таблица курсов
class Course(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    provider_id: int | None = Field(default=None, foreign_key="provider.id")
    title: str = Field(index=True)
    description: str
    source_url: str | None = None
    # Вектор описания курса для поиска
    embedding: list[float] | None = Field(
        sa_column=Column(Vector(384)), default=None
    )

# Провайдеры курсов (Coursera, Stepik, ВУЗ и т.д.)
class Provider(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    provider_url: str | None = None

# 2. Основная таблица пользователя

class UserRole(str, Enum):
    STUDENT = "student"
    EMPLOYER = "employer"
    ADMIN = "admin"

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    role: UserRole = Field(
        default=UserRole.STUDENT,
        sa_column=sa.Column(sa.Enum(UserRole))
    )

# Добавляем связи:
    student_profile: "StudentProfile" = Relationship(back_populates="user")
    employer_profile: "EmployerProfile" = Relationship(back_populates="user")
    search_history: List["SearchHistory"] = Relationship(back_populates="user")

# 3. Профиль студента
class StudentProfile(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    gpa: float | None = None
    # Вектор интересов студента
    interests_embedding: List[float] | None = Field(
        sa_column=Column(Vector(384)), default=None
    )

    user: User = Relationship(back_populates="student_profile")
    skills: List["Skill"] = Relationship(back_populates="students", link_model=StudentSkill)
    applications: List["Application"] = Relationship(back_populates="student")
    favorite_courses: List["Course"] = Relationship(back_populates="students", link_model=UserCourse)

# 4. Профиль работодателя
class EmployerProfile(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    company_name: str 
    industry: str | None = None
    region: str |None = None

# 5. Справочник навыков
class Skill(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    category: str | None = None

# 6.Таблица-связка для Студентов и Навыков (Many-to-Many)
class StudentSkill(SQLModel, table=True):
    student_id: int | None = Field(default=None, foreign_key="studentprofile.id", primary_key=True)
    skill_id: int | None = Field(default=None, foreign_key="skill.id", primary_key=True)
    level: int = 1  # Например, от 1 до 5

# 7. Вакансии
class Vacancy(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    employer_id: int = Field(foreign_key="employerprofile.id")
    title: str
    description: str
    requirements: str | None = None
    location: str | None = None
    salary_range: str | None = None
    is_internship: bool = Field(default=False)
    
    # Вектор для поиска совпадений со студентом
    embedding: list[float] | None = Field(
        sa_column=Column(Vector(384)), default=None
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 8. Отклики на вакансии (Applications)

class ApplicationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class Application(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    vacancy_id: int = Field(foreign_key="vacancy.id", index=True)
    student_id: int = Field(foreign_key="studentprofile.id", index=True)
    cover_letter: str | None = None
    status: ApplicationStatus = Field(
        default=ApplicationStatus.PENDING,
        sa_column=sa.Column(sa.Enum(ApplicationStatus)) 
    )
    match_score: float | None = None # Сюда будем записывать % совпадения по векторам
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 9. Категории курсов
class Category(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    
    # Связь с курсами через промежуточную таблицу
    courses: List["Course"] = Relationship(back_populates="categories", link_model="coursecategory")

# 10. Таблица-связка Курс <-> Категория
class CourseCategory(SQLModel, table=True):
    course_id: int = Field(foreign_key="course.id", primary_key=True)
    category_id: int = Field(foreign_key="category.id", primary_key=True)

# 11. Избранные курсы пользователя (UserCourse)
class UserCourse(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="studentprofile.id", index=True)
    course_id: int = Field(foreign_key="course.id", index=True)
    status: str = Field(default="interested") # например: "interested", "in_progress", "completed"
    added_at: datetime = Field(default_factory=datetime.utcnow)

# 12. Рекомендации ИИ (UserCourseRecommendation)
class UserCourseRecommendation(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="studentprofile.id", index=True)
    course_id: int = Field(foreign_key="course.id", index=True)
    score: float  # Насколько подходит курс (0.0 - 1.0)
    reason: str | None = None # Текст: "Потому что вы интересовались Python"
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 13. История поиска (SearchHistory)
class SearchHistory(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    query_text: str
    # Сохраняем вектор запроса, чтобы понимать, как менялись интересы
    query_embedding: List[float] | None = Field(
        sa_column=Column(Vector(384)), default=None
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 14. Таблица-связка Вакансия <-> Навык
class VacancySkill(SQLModel, table=True):
    vacancy_id: int = Field(foreign_key="vacancy.id", primary_key=True)
    skill_id: int = Field(foreign_key="skill.id", primary_key=True)
    is_required: bool = Field(default=True) # Обязателен навык или желателен