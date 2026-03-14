from pydantic import BaseModel

class CourseRead(BaseModel):
    id: int
    title: str
    description: str
    
    class Config:
        from_attributes = True

class RecommendationResponse(BaseModel):
    query: str
    results: list[CourseRead]