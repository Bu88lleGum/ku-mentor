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
from app.schemas.favourite import FavouriteToggleResponse
from app.crud.favourite_vacancy import toggle_favourite_vacancy, remove_favourite_vacancy
from sqlmodel import desc
from app.models.student import StudentProfile

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


@router.get("/latest", response_model=List[VacancyRead])
def read_latest_vacancies(session: Session = Depends(get_session)):
    """
    ЭНДПОИНТ: Получение 10 последних добавленных вакансий.
    Идеально подходит для фронтенд-компонента "Свежие вакансии".
    """
    # Сортируем по убыванию id (или по полю created_at, если оно есть в модели Vacancy)
    statement = select(Vacancy).order_by(desc(Vacancy.id)).limit(10)
    latest_vacancies = session.exec(statement).all()
    return latest_vacancies


@router.get("/recommendations", response_model=List[VacancyRead])
def read_recommended_vacancies(
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Получение 10 рекомендованных вакансий на основе ИИ-векторов.
    Доступен только авторизованным студентам/соискателям.
    """
    # 1. Получаем профиль студента, чтобы взять его вектор интересов
    student_profile = session.exec(
        select(StudentProfile).where(StudentProfile.user_id == current_user_id)
    ).first()
    
    if not student_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль соискателя не найден. Рекомендации недоступны."
        )
        
    # Генерируем эмбеддинг, если его по какой-то причине нет в БД, но есть текстовые интересы
    if student_profile.interests_embedding is None:
        if student_profile.interests:
            interests_text = ", ".join(student_profile.interests)
            student_profile.interests_embedding = ai_service.embed_text(interests_text)
            session.add(student_profile)
            session.commit()
        else:
            # Если интересов совсем нет — отдаем базовый топ вакансий
            return session.exec(select(Vacancy).limit(10)).all()

    # 2. Получаем все вакансии, у которых сгенерирован эмбеддинг
    all_vacancies = session.exec(select(Vacancy).where(Vacancy.embedding != None)).all()
    
    if not all_vacancies:
        return []

    # 3. Считаем косинусное сходство между вектором интересов пользователя и вектором вакансии
    scored_vacancies = []
    for vacancy in all_vacancies:
        score = ai_service.get_similarity(student_profile.interests_embedding, vacancy.embedding)
        scored_vacancies.append((score, vacancy))
        
    # 4. Сортируем по коэффициенту сходства (от большего к меньшему) и берем топ-10
    scored_vacancies.sort(key=lambda x: x[0], reverse=True)
    recommended_vacancies = [vacancy for score, vacancy in scored_vacancies[:10]]
    
    return recommended_vacancies


@router.get("/personalized-trending", response_model=List[VacancyRead])
def read_personalized_trending_vacancies(
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: ТОП-5 вакансий, которые одновременно являются СВЕЖИМИ и ПОДХОДЯТ по интересам.
    Реализует гибридное ранжирование (Косинусное сходство + Коэффициент новизны).
    """
    # 1. Получаем профиль студента
    student_profile = session.exec(
        select(StudentProfile).where(StudentProfile.user_id == current_user_id)
    ).first()
    
    if not student_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль соискателя не найден."
        )
        
    # Генерируем эмбеддинг интересов, если его нет
    if student_profile.interests_embedding is None:
        if student_profile.interests:
            interests_text = ", ".join(student_profile.interests)
            student_profile.interests_embedding = ai_service.embed_text(interests_text)
            session.add(student_profile)
            session.commit()
        else:
            # Если интересов нет, отдаем просто 5 последних созданных вакансий
            return session.exec(select(Vacancy).order_by(desc(Vacancy.id)).limit(5)).all()

    # 2. Получаем вакансии с валидными эмбеддингами
    all_vacancies = session.exec(select(Vacancy).where(Vacancy.embedding != None)).all()
    if not all_vacancies:
        return []

    # 3. Находим Мин и Макс ID вакансий для нормализации новизны (Min-Max Normalization)
    all_ids = [v.id for v in all_vacancies]
    min_id = min(all_ids)
    max_id = max(all_ids)
    id_range = max_id - min_id if max_id != min_id else 1

    # 4. Веса для кастомизации гибридного поиска (в сумме дают 1.0)
    WEIGHT_SIMILARITY = 0.6  # Насколько важна релевантность по ИИ (60%)
    WEIGHT_RECENCY = 0.4     # Насколько важна новизна вакансии (40%)

    scored_vacancies = []
    for vacancy in all_vacancies:
        # Считаем семантическое сходство (0.0 - 1.0)
        similarity = ai_service.get_similarity(student_profile.interests_embedding, vacancy.embedding)
        
        # Нормализуем новизну: чем ближе ID к максимальному, тем ближе значение к 1.0
        recency = (vacancy.id - min_id) / id_range
        
        # Вычисляем финальный гибридный скор
        final_score = (similarity * WEIGHT_SIMILARITY) + (recency * WEIGHT_RECENCY)
        
        scored_vacancies.append((final_score, vacancy))

    # 5. Сортируем по финальному скору сверху вниз и забираем ровно 5 элементов для промо-блоков/баннеров
    scored_vacancies.sort(key=lambda x: x[0], reverse=True)
    trending_vacancies = [vacancy for score, vacancy in scored_vacancies[:5]]

    return trending_vacancies


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


@router.post("/{vacancy_id}/favourite", response_model=FavouriteToggleResponse)
def toggle_vacancy(
    vacancy_id: int, 
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Добавление вакансии в избранное или её удаление (Toggle).
    Доступно любому авторизованному пользователю.
    """
    # 1. Проверяем, существует ли вообще вакансия, которую хотят лайкнуть
    db_vacancy = session.get(Vacancy, vacancy_id)
    if not db_vacancy:
        raise HTTPException(status_code=404, detail="Вакансия не найдена")

    # 2. Передаем управление в CRUD-метод, используя залогиненный ID пользователя
    is_added = toggle_favourite_vacancy(session, user_id=current_user_id, vacancy_id=vacancy_id)

    # 3. Формируем ответ согласно Pydantic-схеме FavouriteToggleResponse
    if is_added:
        return {"is_favourited": True, "message": "Вакансия добавлена в избранное"}
    return {"is_favourited": False, "message": "Вакансия удалена из избранного"}

@router.delete("/{vacancy_id}/favourite", status_code=204)
def delete_vacancy_from_favourite(
    vacancy_id: int,
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Явное удаление вакансии из избранного.
    Возвращает статус 204 No Content в случае успешного удаления.
    """
    # Вызываем CRUD-метод
    success = remove_favourite_vacancy(session, user_id=current_user_id, vacancy_id=vacancy_id)
    
    # Если на фронтенде пытаются удалить то, чего и так нет в избранном
    if not success:
        raise HTTPException(
            status_code=404, 
            detail="Вакансия не найдена в вашем списке избранного"
        )
        
    # Статус 204 автоматически не возвращает никакого тела ответа
    return