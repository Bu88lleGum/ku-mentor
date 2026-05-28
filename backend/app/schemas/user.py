from pydantic import BaseModel, EmailStr, Field
from typing import List
from app.models.enums import UserRole
from datetime import datetime
from typing import Optional



# То, что мы ждем от фронтенда при регистрации
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.STUDENT
    
    # Добавляем опциональные поля для создания профиля "на лету"
    company_name: Optional[str] = None
    industry: Optional[str] = None
    region: Optional[str] = None


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

class StudentProfileRead(BaseModel):
    gpa: float | None
    interests: List[str] | None

    class Config:
        from_attributes = True

class EmployerProfileRead(BaseModel):
    company_name: str
    industry: str | None = None
    region: str | None = None

    class Config:
        from_attributes = True

# То, что мы отдаем фронтенду (без пароля!)
class UserRead(BaseModel):
    id: int
    email: str
    username: str
    role: str 
    created_at: datetime
    
    # Добавляем оба профиля как Optional
    student_profile: Optional[StudentProfileRead] = None
    employer_profile: Optional[EmployerProfileRead] = None
    class Config:
        from_attributes = True
    
class UserRegisterResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead  # все данные пользователя и его профиля