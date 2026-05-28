from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from sqlalchemy.orm import joinedload
from app.core.database import get_session
from app.models import EmployerProfile
from app.schemas.employer import EmployerFullInfoResponse

# Инициализируем роутер без префикса (например, префикс "/employers" будет задан при подключении роутера в main.py)
router = APIRouter()


@router.get("/{employer_id}", response_model=EmployerFullInfoResponse)
def get_employer_profile_with_vacancies(
    employer_id: int,
    session: Session = Depends(get_session) # Внедрение зависимости (DI) для получения сессии БД
):
    """
    ЭНДПОИНТ: Получение публичного или детального профиля работодателя вместе со списком его активных вакансий.
    Используется на фронтенде при клике на карточку компании или в заголовке вакансии, чтобы посмотреть "все вакансии компании".
    """
    
    # 1. Строим SQL-запрос с использованием жадной загрузки (Eager Loading / joinedload).
    # Это заставляет SQLAlchemy выполнить один эффективный SQL-запрос с оператором LEFT OUTER JOIN,
    # вместо того чтобы делать отдельный ленивый (lazy) запрос к базе данных для каждой вакансии позже.
    statement = (
        select(EmployerProfile)
        .where(EmployerProfile.id == employer_id)
        .options(joinedload(EmployerProfile.vacancies)) # Указываем принудительно подтянуть связанный список вакансий
    )
    
    # Выполняем запрос в сессии и извлекаем первую найденную запись (или None)
    employer_profile = session.exec(statement).first()
    
    # 2. Валидация на существование записи:
    # Если в базе данных нет работодателя с таким ID, прерываем выполнение и возвращаем клиенту ошибку 404.
    if not employer_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Работодатель не найден"
        )
    
    # 3. Возвращаем полученный объект профиля.
    # Благодаря тому, что в Pydantic-схеме EmployerFullInfoResponse активирован параметр 
    # `from_attributes = True` (или `orm_mode = True` в старых версиях), сериализатор автоматически 
    # прочитает атрибут .vacancies у модели базы данных и упакует его в JSON-массив вакансий.
    return employer_profile