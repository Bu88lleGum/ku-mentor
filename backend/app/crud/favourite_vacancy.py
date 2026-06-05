from typing import List, Optional
from sqlmodel import Session, select
from app.models.favourite_vacancy import FavouriteVacancy
from app.models.vacancy import Vacancy

def toggle_favourite_vacancy(session: Session, user_id: int, vacancy_id: int) -> bool:
    """
    Переключает состояние «Избранного» для вакансии (Toggle).
    Возвращает True, если вакансия добавлена в избранное, 
    и False, если удалена из него.
    """
    # Ищем, есть ли уже такая запись в БД
    statement = select(FavouriteVacancy).where(
        Canstraint := (FavouriteVacancy.user_id == user_id) & 
        (FavouriteVacancy.vacancy_id == vacancy_id)
    )
    db_favourite = session.exec(statement).first()

    if db_favourite:
        # Если лайк уже стоит — удаляем его (дизлайк)
        session.delete(db_favourite)
        session.commit()
        return False
    else:
        # Если лайка нет — создаем новую запись
        new_favourite = FavouriteVacancy(user_id=user_id, vacancy_id=vacancy_id)
        session.add(new_favourite)
        session.commit()
        return True

def is_vacancy_favourited(session: Session, user_id: int, vacancy_id: int) -> bool:
    """Проверяет, находится ли вакансия в избранном у конкретного пользователя."""
    statement = select(FavouriteVacancy).where(
        (FavouriteVacancy.user_id == user_id) & 
        (FavouriteVacancy.vacancy_id == vacancy_id)
    )
    return session.exec(statement).first() is not None

def get_user_favourite_vacancies(session: Session, user_id: int, skip: int = 0, limit: int = 20) -> List[Vacancy]:
    """
    Возвращает список самих объектов Vacancy, которые пользователь добавил в избранное.
    """
    statement = (
        select(Vacancy)
        .join(FavouriteVacancy, Vacancy.id == FavouriteVacancy.vacancy_id)
        .where(FavouriteVacancy.user_id == user_id)
        .offset(skip)
        .limit(limit)
    )
    return session.exec(statement).all()

def remove_favourite_vacancy(session: Session, user_id: int, vacancy_id: int) -> bool:
    """
    Прямое удаление вакансии из избранного конкретного пользователя.
    Возвращает True, если запись была найдена и успешна удалена,
    и False, если такой вакансии в избранном у пользователя не было.
    """
    # 1. Ищем запись связи пользователя и вакансии
    statement = select(FavouriteVacancy).where(
        (FavouriteVacancy.user_id == user_id) & 
        (FavouriteVacancy.vacancy_id == vacancy_id)
    )
    db_favourite = session.exec(statement).first()

    # 2. Если запись существует — удаляем её
    if db_favourite:
        session.delete(db_favourite)
        session.commit()
        return True
        
    return False