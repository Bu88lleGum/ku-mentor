from sqlmodel import Session, select
from app.schemas import SkillCreate
from app.models import Skill

def add_skill(session: Session, skill_in: SkillCreate) -> Skill:

    new_skill = Skill(
        name=skill_in.name,
        category=skill_in.category
    )
    session.add(new_skill)
    session.commit()
    session.refresh(new_skill)

    return new_skill

def get_all_skills(session: Session):
    statement = select(Skill)
    return session.exec(statement).all()

def update_skill(session: Session, skill_id: int, skill_in: SkillCreate) -> Skill:
    db_skill = session.get(Skill, skill_id)
    if not db_skill:
        return None
    
    # Обновляем поля
    skill_data = skill_in.model_dump(exclude_unset=True)
    for key, value in skill_data.items():
        setattr(db_skill, key, value)
    
    session.add(db_skill)
    session.commit()
    session.refresh(db_skill)
    return db_skill

def delete_skill(session: Session, skill_id: int) -> bool:
    db_skill = session.get(Skill, skill_id)
    if not db_skill:
        return False
    
    session.delete(db_skill)
    session.commit()
    return True