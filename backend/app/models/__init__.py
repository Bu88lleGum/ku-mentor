# app/models/__init__.py
from .enums import UserRole, CourseStatus, ApplicationStatus
from .links import (
    CourseCategory, 
    StudentSkill, 
    VacancySkill, 
    StudentCourse, 
    StudentCourseRecommendation
)
from .user import User
from .student import StudentProfile
from .employer import EmployerProfile
from .course import Course
from .category import Category
from .provider import Provider
from .skill import Skill
from .vacancy import Vacancy
from .search import SearchHistory
from .application import Application

# Это поможет Alembic найти метаданные всех таблиц
from sqlmodel import SQLModel
metadata = SQLModel.metadata