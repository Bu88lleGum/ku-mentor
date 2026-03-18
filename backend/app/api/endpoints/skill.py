from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from app.core.database import get_session
from app.models import Skill
from app.schemas import SkillCreate, SkillRead
from app.crud import skill as skill_crud
from typing import List

router = APIRouter()

@router.post("/add", response_model=SkillRead) # Лучше возвращать модель Skill с ID
def skill_create(skill_in: SkillCreate, session: Session = Depends(get_session)):
    # 1. Сначала ищем, существует ли уже такой скилл
    existing_skill = session.exec(select(Skill).where(Skill.name == skill_in.name)).first()
    if existing_skill:
        raise HTTPException(status_code=400, detail="Skill уже существует")
    
    # 2. Только если его нет — создаем
    return skill_crud.add_skill(session, skill_in)

@router.get("/", response_model=List[SkillRead])
def read_skills(session: Session = Depends(get_session)):

    # Возвращает список всех доступных навыков с именами и категориями.
    
    skills = skill_crud.get_all_skills(session)
    return skills

@router.patch("/{skill_id}", response_model=SkillRead)
def patch_skill(
    skill_id: int, 
    skill_in: SkillCreate, 
    session: Session = Depends(get_session)
):
    updated_skill = skill_crud.update_skill(session, skill_id, skill_in)
    if not updated_skill:
        raise HTTPException(status_code=404, detail="Скилл не найден")
    return updated_skill

@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_skill(skill_id: int, session: Session = Depends(get_session)):
    success = skill_crud.delete_skill(session, skill_id)
    if not success:
        raise HTTPException(status_code=404, detail="Скилл не найден")
    return None # 204 No Content не возвращает тело