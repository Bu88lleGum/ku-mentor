from sqlmodel import Session, select
from app.models import Vacancy, VacancySkill, Skill
from app.services.ai_engine import ai_service
from app.schemas.vacancy import VacancyCreate
from fastapi import HTTPException

def create_vacancy(session: Session, employer_id: int, vacancy_in: VacancyCreate):
    # 1. Сначала получаем названия скиллов, чтобы усилить эмбеддинг
    # Это сделает поиск в разы точнее
    skills_query = select(Skill).where(Skill.id.in_(vacancy_in.skill_ids))
    db_skills = session.exec(skills_query).all()
    skill_names = [s.name for s in db_skills]
    
    # Проверка на существование всех скиллов
    if len(db_skills) != len(vacancy_in.skill_ids):
        found_ids = {s.id for s in db_skills}
        missing = [s_id for s_id in vacancy_in.skill_ids if s_id not in found_ids]
        raise HTTPException(status_code=400, detail=f"Скиллы не найдены: {missing}")

    # 2. Генерируем эмбеддинг
    # Используем твой "усиленный" метод, прокидывая скиллы как категории
    vector = ai_service.create_embedding(
        title=vacancy_in.title,
        description=f"{vacancy_in.description} {vacancy_in.requirements}",
        categories=skill_names
    )

    # 3. Создаем вакансию
    db_vacancy = Vacancy(
        **vacancy_in.model_dump(exclude={"skill_ids"}),
        employer_id=employer_id,
        embedding=vector
    )
    session.add(db_vacancy)
    session.flush() # Получаем ID вакансии без полного коммита

    # 4. Привязываем скиллы
    for s_id in vacancy_in.skill_ids:
        v_skill = VacancySkill(vacancy_id=db_vacancy.id, skill_id=s_id)
        session.add(v_skill)
    
    session.commit()
    session.refresh(db_vacancy)
    return db_vacancy

def get_employer_vacancies(session: Session, employer_id: int):
    return session.exec(select(Vacancy).where(Vacancy.employer_id == employer_id)).all()