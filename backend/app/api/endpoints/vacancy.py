from fastapi import APIRouter, Depends, HTTPException, status, Query
from requests import session
from app.core.security import get_current_user_id
from app.core.database import get_session
from app.crud.vacancy import create_vacancy, get_employer_vacancies, get_vacancy_by_id, get_vacancies, delete_vacancy
from app.schemas.vacancy import VacancyCreate, VacancyRead, VacancyUpdate
from app.models import EmployerProfile, Vacancy, Skill, VacancySkill
from app.services.ai_engine import ai_service
from typing import List
from sqlmodel import select, Session

# Инициализируем роутер для обработки всех запросов, связанных с вакансиями (Vacancies)
router = APIRouter()


@router.post("/", response_model=VacancyRead)
def add_new_vacancy(
    vacancy_in: VacancyCreate,
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id) # Защищаем эндпоинт авторизацией
):
    """
    ЭНДПОИНТ: Создание новой вакансии работодателем.
    """
    # 1. Проверяем, что текущий залогиненный пользователь действительно имеет профиль работодателя
    employer_profile = session.exec(select(EmployerProfile).where(EmployerProfile.user_id == current_user_id)).first()
    
    # 2. Если профиля нет (например, пытается создать студент) — блокируем операцию
    if not employer_profile:
        raise HTTPException(status_code=403, detail="Только работодатель может создавать вакансии")

    # 3. Передаем управление в CRUD, привязывая вакансию к найденному ID работодателя
    return create_vacancy(session, employer_profile.id, vacancy_in)


@router.get("/my", response_model=List[VacancyRead])
def read_my_vacancies(
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Получение списка всех вакансий, созданных текущим работодателем (для ЛК компании).
    """
    # 1. Находим профиль работодателя по user_id из токена
    employer_profile = session.exec(select(EmployerProfile).where(EmployerProfile.user_id == current_user_id)).first()
    
    # 2. Если профиля компании нет, просим сначала заполнить информацию о себе
    if not employer_profile:
        raise HTTPException(status_code=404, detail="Профиль работодателя не найден. Сначала заполните данные о компании.")
    
    # 3. Возвращаем массив вакансий конкретной компании через CRUD-функцию
    return get_employer_vacancies(session, employer_profile.id)


@router.patch("/{vacancy_id}", response_model=VacancyRead)
def update_vacancy(
    vacancy_id: int,
    vacancy_data: VacancyUpdate, # Содержит только те поля, которые пользователь решил изменить
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Частичное обновление данных вакансии, её навыков и пересчет ИИ-эмбеддинга.
    """
    # 1. ЗАЩИТА: Ищем профиль текущего работодателя
    employer = session.exec(select(EmployerProfile).where(EmployerProfile.user_id == current_user_id)).first()
    if not employer:
        raise HTTPException(status_code=403, detail="У вас нет профиля работодателя")

    # 2. ЗАЩИТА: Проверяем, существует ли вакансия и принадлежит ли она именно этому работодателю
    db_vacancy = session.get(Vacancy, vacancy_id)
    if not db_vacancy or db_vacancy.employer_id != employer.id:
        raise HTTPException(status_code=404, detail="Вакансия не найдена или нет доступа")

    # 3. ОБНОВЛЕНИЕ ТЕКСТОВЫХ ПОЛЕЙ:
    # Исключаем из дампа неприсланные поля (exclude_unset) и поле со списком id навыков
    update_dict = vacancy_data.model_dump(exclude_unset=True, exclude={"skill_ids"})
    for key, value in update_dict.items():
        setattr(db_vacancy, key, value) # Динамически обновляем атрибуты модели Vacancy

    # 4. ОБНОВЛЕНИЕ СВЯЗЕЙ MANY-TO-MANY (Скиллы вакансии):
    if vacancy_data.skill_ids is not None:
        # Сначала полностью удаляем старые привязки вакансии к скиллам в связующей таблице VacancySkill
        session.execute(delete(VacancySkill).where(VacancySkill.vacancy_id == vacancy_id))

        # Записываем новые привязки из пришедшего массива идентификаторов
        for s_id in vacancy_data.skill_ids:
            if s_id != 0: # Игнорируем технический ID 0, если он прилетел с фронтенда
                session.add(VacancySkill(vacancy_id=vacancy_id, skill_id=s_id))
        
        # Синхронизируем изменения с БД (без коммита), чтобы новые связи стали доступны для запросов ниже
        session.flush()

    # 5. ИНТЕГРАЦИЯ С ИИ (Пересчет векторного эмбеддинга для умного матчинга):
    # Проверяем, изменилось ли что-то, что влияет на смысл вакансии (тексты или навыки)
    should_recompute = any(k in update_dict for k in ["title", "description", "requirements"]) or vacancy_data.skill_ids is not None
    
    if should_recompute:
        # Подтягиваем строковые названия актуальных навыков, завязанных на эту вакансию
        current_skill_names = session.exec(
            select(Skill.name).join(VacancySkill).where(VacancySkill.vacancy_id == vacancy_id)
        ).all()
        
        # Отправляем обновленный текст и навыки в AI-сервис для генерации нового вектора
        db_vacancy.embedding = ai_service.create_embedding(
            title=db_vacancy.title,
            description=f"{db_vacancy.description} {db_vacancy.requirements}",
            categories=current_skill_names
        )

    # 6. Сохраняем все изменения, фиксируем транзакцию и возвращаем обновленный объект
    session.add(db_vacancy)
    session.commit()
    session.refresh(db_vacancy)
    return db_vacancy


@router.get("/{vacancy_id}", response_model=VacancyRead)
def read_vacancy(
    vacancy_id: int,
    session: Session = Depends(get_session)
):
    """
    ЭНДПОИНТ: Публичный просмотр одной вакансии по ID (доступен всем пользователям).
    """
    # 1. Запрашиваем вакансию через CRUD
    db_vacancy = get_vacancy_by_id(session, vacancy_id)
    
    # 2. Если в базе записи нет — возвращаем стандартную ошибку 404
    if not db_vacancy:
        raise HTTPException(status_code=404, detail="Вакансия не найдена")
        
    # 3. Возвращаем объект, FastAPI автоматически отфильтрует его по Pydantic схеме VacancyRead
    return db_vacancy


@router.get("/list", response_model=List[VacancyRead])
def read_vacancies(
    session: Session = Depends(get_session),
    skip: int = 0, # Параметр пагинации: сколько записей пропустить
    limit: int = Query(default=20, le=100) # Параметр пагинации: сколько выгрузить (максимум 100 за раз)
):
    """
    ЭНДПОИНТ: Получение общего списка вакансий с поддержкой пагинации (Главный поиск/Лента вакансий).
    """
    return get_vacancies(session, skip=skip, limit=limit)


@router.delete("/{vacancy_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_vacancy(
    vacancy_id: int, 
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)):
    """
    ЭНДПОИНТ: Удаление вакансии её создателем. Возвращает статус 204 No Content.
    """
    # 1. Ищем профиль работодателя и саму вакансию в базе данных
    employer = session.exec(select(EmployerProfile).where(EmployerProfile.user_id == current_user_id)).first()
    db_vacancy = session.get(Vacancy, vacancy_id)
    
    # 2. ЗАЩИТА: Проверяем, существует ли вакансия и принадлежит ли она текущему пользователю
    if not db_vacancy or not employer or db_vacancy.employer_id != employer.id:
        raise HTTPException(status_code=404, detail="Вакансия не найдена или у вас нет прав на её удаление")
    
    # 3. Вызываем CRUD-функцию удаления записи
    delete_vacancy(session, vacancy_id)

    # При статусе 204 возвращается пустой ответ (None) — тело ответа отсутствует по спецификации HTTP
    return None