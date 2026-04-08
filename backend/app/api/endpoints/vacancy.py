from fastapi import APIRouter, Depends, HTTPException
from requests import session
from app.core.security import get_current_user_id
from app.core.database import get_session
from app.crud.vacancy import create_vacancy, get_employer_vacancies
from app.schemas.vacancy import VacancyCreate, VacancyRead, VacancyUpdate
from app.models import EmployerProfile, Vacancy, Skill, VacancySkill
from app.services.ai_engine import ai_service
from typing import List
from sqlmodel import select, Session

router = APIRouter()

@router.post("/", response_model=VacancyRead)
def add_new_vacancy(
    vacancy_in: VacancyCreate,
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    # Тут должна быть проверка: является ли юзер работодателем?
    employer_profile = session.exec(select(EmployerProfile).where(EmployerProfile.user_id == current_user_id)).first()
    if not employer_profile:
        raise HTTPException(status_code=403, detail="Только работодатель может создавать вакансии")

    return create_vacancy(session, employer_profile.id, vacancy_in)

@router.get("/my", response_model=List[VacancyRead])
def read_my_vacancies(
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    employer_profile = session.exec(select(EmployerProfile).where(EmployerProfile.user_id == current_user_id)).first()
    if not employer_profile:
        raise HTTPException(status_code=404, detail="Профиль работодателя не найден. Сначала заполните данные о компании.")
    return get_employer_vacancies(session, employer_profile.id)

@router.patch("/{vacancy_id}", response_model=VacancyRead)
def update_vacancy(
    vacancy_id: int,
    vacancy_data: VacancyUpdate,
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    # 1. Проверка прав (работодатель может менять только свои вакансии)
    employer = session.exec(select(EmployerProfile).where(EmployerProfile.user_id == current_user_id)).first()
    db_vacancy = session.get(Vacancy, vacancy_id)
    
    if not db_vacancy or db_vacancy.employer_id != employer.id:
        raise HTTPException(status_code=404, detail="Вакансия не найдена или нет доступа")

    # 2. Обновляем текстовые поля (title, description и т.д.)
    update_dict = vacancy_data.model_dump(exclude_unset=True, exclude={"skill_ids"})
    for key, value in update_dict.items():
        setattr(db_vacancy, key, value)

    # 3. Обновляем скиллы (удаляем старые связи Many-to-Many и пишем новые)
    if vacancy_data.skill_ids is not None:
        from sqlmodel import delete
        # Очищаем старые привязки
        session.execute(delete(VacancySkill).where(VacancySkill.vacancy_id == vacancy_id))
        # Создаем новые привязки
        for s_id in vacancy_data.skill_ids:
            if s_id != 0:
                session.add(VacancySkill(vacancy_id=vacancy_id, skill_id=s_id))
        
        # Сбрасываем изменения в БД (flush), чтобы при поиске имен скиллов ниже мы видели новые данные
        session.flush()

    # 4. Пересчитываем эмбеддинг, если что-то изменилось (текст или скиллы)
    should_recompute = any(k in update_dict for k in ["title", "description", "requirements"]) or vacancy_data.skill_ids is not None
    
    if should_recompute:
        # Достаем актуальные имена скиллов для "категорий" в ИИ
        current_skill_names = session.exec(
            select(Skill.name).join(VacancySkill).where(VacancySkill.vacancy_id == vacancy_id)
        ).all()
        
        # Обновляем вектор вакансии
        db_vacancy.embedding = ai_service.create_embedding(
            title=db_vacancy.title,
            description=f"{db_vacancy.description} {db_vacancy.requirements}",
            categories=current_skill_names
        )

    # 5. Сохраняем всё одним махом
    session.add(db_vacancy)
    session.commit()
    session.refresh(db_vacancy)
    return db_vacancy