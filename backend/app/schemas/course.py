from pydantic import BaseModel, Field, HttpUrl
from typing import List

# Схема для создания (входные данные)
class CourseCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str 
    sourceUrl: HttpUrl | None = None
    provider_id: int = Field(...) # СТРОГО: Обязательное поле
    category_ids: List[int] = [] 

# Схема для чтения (выходные данные)
class CategorySimple(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True # ДОБАВЬ ЭТУ СТРОЧКУ СЮДА

class CourseRead(BaseModel):
    id: int
    title: str
    description: str
    sourceUrl: str | None
    provider_id: int
    categories: List[CategorySimple] = [] 
    
    class Config:
        from_attributes = True

class RecommendationResponse(BaseModel):
    query: str
    results: list[CourseRead]