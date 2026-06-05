from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import List
from sqlmodel import Session
from app.core.database import get_session
from app.schemas.course import CourseCreate, CourseRead
from app.crud import course as course_crud
from app.schemas.favourite import FavouriteToggleResponse
from app.crud.favourite_course import toggle_favourite_course, remove_favourite_course
from app.core.security import get_current_user_id
from app.models.course import Course
from app.core.database import get_session


router = APIRouter()

@router.post("/", response_model=CourseRead)
def create_new_course(course_in: CourseCreate, session: Session = Depends(get_session)):
    return course_crud.add_course(session, course_in)

@router.get("/", response_model=List[CourseRead])
def read_courses(
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = Query(default=20, le=100) # Ограничиваем максимум 100 за раз
):
    return course_crud.get_courses(session, skip=skip, limit=limit)

@router.post("/{course_id}/favourite", response_model=FavouriteToggleResponse)
def toggle_course_favourite(
    course_id: int, 
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Добавление курса в избранное или его удаление (Toggle).
    Доступно любому авторизованному пользователю.
    """
    # 1. Проверяем, существует ли курс, который хотят добавить в закладки
    db_course = session.get(Course, course_id)
    if not db_course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Курс не найден"
        )

    # 2. Переключаем состояние через CRUD
    is_added = toggle_favourite_course(session, user_id=current_user_id, course_id=course_id)

    # 3. Возвращаем ответ согласно схеме FavouriteToggleResponse
    if is_added:
        return {"is_favourited": True, "message": "Курс добавлен в избранное"}
    return {"is_favourited": False, "message": "Курс удален из избранного"}

@router.delete("/{course_id}/favourite", status_code=status.HTTP_204_NO_CONTENT)
def delete_course_from_favourite(
    course_id: int,
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Явное удаление курса из избранного.
    Возвращает статус 204 No Content в случае успешного удаления.
    """
    # Вызываем только что написанный CRUD-метод
    success = remove_favourite_course(session, user_id=current_user_id, course_id=course_id)
    
    # Если фронтенд прислал запрос на удаление курса, которого и так нет в закладках
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Курс не найден в вашем списке избранного"
        )
        
    # Статус 204 автоматически не возвращает никакого тела (теперь роут идеально синхронен с фронтендом)
    return