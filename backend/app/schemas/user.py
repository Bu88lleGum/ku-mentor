from pydantic import BaseModel, EmailStr, Field
from typing import List
from app.models.enums import UserRole

# То, что мы ждем от фронтенда при регистрации
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.STUDENT

# То, что мы отдаем фронтенду (без пароля!)
class UserRead(BaseModel):
    id: int
    username: str
    email: str
    
    class Config:
        from_attributes = True

# Базовые поля работодателя
class EmployerProfileUpdate(BaseModel):
    company_name: str
    industry: str | None = None
    region: str | None = None

    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    # ge=0 (>=0), le=4.0 (<=4.0)
    gpa: float | None = Field(None, ge=0, le=4.0) 
    interests: List[str] | None = None
    skill_ids: List[int] | None = None
    
    class Config:
        from_attributes = True # Позволяет Pydantic читать данные прямо из SQLModel объектов