from sqlmodel import Session, select
from app.models import Vacancy, VacancySkill
from app.services.ai_engine import ai_service
from app.schemas.vacancy import VacancyCreate
from app.models import Skill
from fastapi import HTTPException

def create_vacancy(session: Session, employer_id: int, vacancy_in: VacancyCreate):
    # 1. Генерируем эмбеддинг для вакансии
    # Склеиваем заголовок и описание для лучшего поиска
    full_text = f"{vacancy_in.title} {vacancy_in.description} {vacancy_in.requirements}"
    vector = ai_service.create_embedding(title=full_text, description="", categories=[])

    # 2. Создаем саму вакансию
    db_vacancy = Vacancy(
        **vacancy_in.model_dump(exclude={"skill_ids"}),
        employer_id=employer_id,
        embedding=vector
    )
    session.add(db_vacancy)
    session.commit()
    session.refresh(db_vacancy)

    # Перед циклом создания связей проверим, существуют ли такие скиллы вообще
    existing_skills = session.exec(select(Skill.id).where(Skill.id.in_(vacancy_in.skill_ids))).all()

    for s_id in vacancy_in.skill_ids:
        if s_id not in existing_skills:
            # Если скилла нет, можем либо пропустить, либо выкинуть красивую ошибку 400
            raise HTTPException(status_code=400, detail=f"Скилл с ID {s_id} не найден")
    
        v_skill = VacancySkill(vacancy_id=db_vacancy.id, skill_id=s_id)
        session.add(v_skill)
    
    session.commit()
    return db_vacancy

def get_employer_vacancies(session: Session, employer_id: int):
    return session.exec(select(Vacancy).where(Vacancy.employer_id == employer_id)).all()