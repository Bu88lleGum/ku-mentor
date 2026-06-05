from typing import List, Optional
from sqlmodel import Session, select
from app.models.favourite_course import FavouriteCourse
from app.models.course import Course

def toggle_favourite_course(session: Session, user_id: int, course_id: int) -> bool:
    """
    Переключает состояние «Избранного» для курса (Toggle).
    Возвращает True, если добавлен, и False, если удален.
    """
    statement = select(FavouriteCourse).where(
        (FavouriteCourse.user_id == user_id) & 
        (FavouriteCourse.course_id == course_id)
    )
    db_favourite = session.exec(statement).first()

    if db_favourite:
        session.delete(db_favourite)
        session.commit()
        return False
    else:
        new_favourite = FavouriteCourse(user_id=user_id, course_id=course_id)
        session.add(new_favourite)
        session.commit()
        return True

def is_course_favourited(session: Session, user_id: int, course_id: int) -> bool:
    """Проверяет, находится ли курс в избранном у конкретного пользователя."""
    statement = select(FavouriteCourse).where(
        (FavouriteCourse.user_id == user_id) & 
        (FavouriteCourse.course_id == course_id)
    )
    return session.exec(statement).first() is not None

def get_user_favourite_courses(session: Session, user_id: int, skip: int = 0, limit: int = 20) -> List[Course]:
    """
    Возвращает список объектов Course из закладок пользователя.
    Подгрузка категорий курса произойдет автоматически, если в модели Course настроен relationship.
    """
    statement = (
        select(Course)
        .join(FavouriteCourse, Course.id == FavouriteCourse.course_id)
        .where(FavouriteCourse.user_id == user_id)
        .offset(skip)
        .limit(limit)
    )
    return session.exec(statement).all()

def remove_favourite_course(session: Session, user_id: int, course_id: int) -> bool:
    """
    Прямое удаление курса из избранного конкретного пользователя.
    Возвращает True, если запись была найдена и успешно удалена,
    и False, если курса не было в закладках у пользователя.
    """
    # 1. Ищем запись связи пользователя и курса
    statement = select(FavouriteCourse).where(
        (FavouriteCourse.user_id == user_id) & 
        (FavouriteCourse.course_id == course_id)
    )
    db_favourite = session.exec(statement).first()

    # 2. Если запись существует — удаляем её из базы данных
    if db_favourite:
        session.delete(db_favourite)
        session.commit()
        return True
        
    return False