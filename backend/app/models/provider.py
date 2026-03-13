from typing import List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.course import Course

class Provider(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    provider_url: str | None = None
    
    courses: List["Course"] = Relationship(back_populates="provider")