from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

# То, что мы ждем от фронтенда при регистрации
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

# То, что мы отдаем фронтенду (без пароля!)
class UserRead(BaseModel):
    id: int
    username: str
    email: str
    
    class Config:
        from_attributes = True # Позволяет Pydantic читать данные прямо из SQLModel объектов