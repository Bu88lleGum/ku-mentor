from pydantic import BaseModel

class SkillCreate(BaseModel):
    name: str
    category: str
    
class SkillRead(BaseModel):
    id: int
    name: str
    category: str

    class Config:
        from_attributes = True # Позволяет Pydantic читать данные прямо из SQLModel объектов