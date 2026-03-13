from typing import List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from app.models.links import CourseCategory

if TYPE_CHECKING:
    from app.models.course import Course


class Category(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    
    courses: List["Course"] = Relationship(
        back_populates="categories", 
        link_model=CourseCategory
    )