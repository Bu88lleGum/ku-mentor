from sqlmodel import Session, select
from app.models import Vacancy, VacancySkill, Skill
from app.services.ai_engine import ai_service
from app.schemas.vacancy import VacancyCreate
from fastapi import HTTPException
from sqlalchemy.orm import joinedload

def create_vacancy(session: Session, employer_id: int, vacancy_in: VacancyCreate):
    """
    ФУНКЦИЯ: Создание вакансии с генерацией AI-вектора (эмбеддинга) и привязкой навыков.
    """
    # 1. ПОДГОТОВКА СКИЛЛОВ ДЛЯ УСИЛЕНИЯ ЭМБЕДДИНГА
    # Запрашиваем из БД все объекты Skill, ID которых переданы в форме создания вакансии
    skills_query = select(Skill).where(Skill.id.in_(vacancy_in.skill_ids))
    db_skills = session.exec(skills_query).all()
    # Собираем текстовый массив названий (например, ['Python', 'FastAPI']), чтобы скормить его AI
    skill_names = [s.name for s in db_skills]
    
    # ВАЛИДАЦИЯ: Если количество найденных в БД скиллов не совпадает с переданными,
    # вычисляем разницу (какие именно ID отсутствуют) и отдаем ошибку 400.
    if len(db_skills) != len(vacancy_in.skill_ids):
        found_ids = {s.id for s in db_skills}
        missing = [s_id for s_id in vacancy_in.skill_ids if s_id not in found_ids]
        raise HTTPException(status_code=400, detail=f"Скиллы не найдены: {missing}")

    # 2. ГЕНЕРАЦИЯ ВЕКТОРНОГО ПРЕДСТАВЛЕНИЯ (AI EMBEDDING)
    # Отправляем текстовые данные вакансии в AI-сервис.
    # Названия скиллов передаются как категории, что критически важно для точного матчинга со студентами.
    vector = ai_service.create_embedding(
        title=vacancy_in.title,
        description=f"{vacancy_in.description} {vacancy_in.requirements}",
        categories=skill_names
    )

    # 3. СОХРАНЕНИЕ ОСНОВНОГО ОБЪЕКТА ВАКАНСИИ
    # Преобразуем Pydantic-схему в словарь, исключая массив skill_ids (так как это поле связующей таблицы, а не модели Vacancy)
    db_vacancy = Vacancy(
        **vacancy_in.model_dump(exclude={"skill_ids"}),
        employer_id=employer_id,
        embedding=vector # Записываем сгенерированный вектор в бд (тип Vector/List[float])
    )
    session.add(db_vacancy)
    # flush() отправляет запрос в БД, чтобы сгенерировать ID для вакансии (Autoincrement),
    # но еще не фиксирует транзакцию окончательно (фиксация будет позже через commit)
    session.flush()

    # 4. ПРИВЯЗКА НАВЫКОВ ЧЕРЕЗ СВЯЗУЮЩУЮ ТАБЛИЦУ (Many-to-Many)
    # Создаем записи в промежуточной таблице VacancySkill для организации связи "Многие-ко-Многим"
    for s_id in vacancy_in.skill_ids:
        v_skill = VacancySkill(vacancy_id=db_vacancy.id, skill_id=s_id)
        session.add(v_skill)
    
    # Окончательно сохраняем всю транзакцию (и вакансию, и привязанные скиллы)
    session.commit()
    # Обновляем объект, чтобы подтянуть все сгенерированные базой поля (например, created_at)
    session.refresh(db_vacancy)
    return db_vacancy


def get_employer_vacancies(session: Session, employer_id: int):
    """
    ФУНКЦИЯ: Получение всех вакансий, опубликованных конкретным работодателем.
    Применяется в личном кабинете компании.
    """
    return session.exec(select(Vacancy).where(Vacancy.employer_id == employer_id)).all()

def get_vacancy_by_id(session: Session, vacancy_id: int) -> Vacancy | None:
    """
    ФУНКЦИЯ: Получение детальной информации о вакансии по её ID.
    Использует joinedload для мгновенной подгрузки данных о компании-работодателе.
    """
    statement = (
        select(Vacancy)
        .where(Vacancy.id == vacancy_id)
        .options(joinedload(Vacancy.employer)) # "Жадная" загрузка профиля работодателя, связанного с вакансией
    )
    return session.exec(statement).first()

def get_vacancies(session: Session, skip: int = 0, limit: int = 20):
    """
    ФУНКЦИЯ: Получение списка всех вакансий с пагинацией (skip и limit).
    Используется на общем дашборде/ленте вакансий для студентов.
    """
    # Выполняем базовый запрос с отступом (skip) и ограничением по количеству (limit)
    statement = select(Vacancy).offset(skip).limit(limit)
    return session.exec(statement).all()

def delete_vacancy(session: Session, vacancy_id: int) -> bool:
    """
    ФУНКЦИЯ: Удаление вакансии по её ID.
    """
    db_vacancy = session.get(Vacancy, vacancy_id)

    # Если вакансия не найдена, возвращаем False (контроллер вернет 404)
    if not db_vacancy:
        return False
    
    # Удаляем объект из сессии и фиксируем удаление в БД
    session.delete(db_vacancy)
    session.commit()
    return True