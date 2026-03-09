from sqlmodel import SQLModel, Field, Column
from pgvector.sqlalchemy import Vector
from typing import List, Optional

class Course(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    embedding: List[float] = Field(sa_column=Column(Vector(384)))