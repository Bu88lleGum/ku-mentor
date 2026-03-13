from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
import sqlalchemy as sa
from app.models.enums import UserRole

if TYPE_CHECKING:
    from app.models.student import StudentProfile
    from app.models.employer import EmployerProfile
    from app.models.search import SearchHistory

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    role: UserRole = Field(
        default=UserRole.STUDENT,
        sa_column=sa.Column(sa.Enum(UserRole))
    )

    # Relationships
    student_profile: Optional["StudentProfile"] = Relationship(back_populates="user")
    employer_profile: Optional["EmployerProfile"] = Relationship(back_populates="user")
    search_history: List["SearchHistory"] = Relationship(back_populates="user")