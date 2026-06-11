from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import List
from sqlmodel import Session, select, desc
from app.core.database import get_session
from app.schemas.course import CourseCreate, CourseRead
from app.crud import course as course_crud
from app.schemas.favourite import FavouriteToggleResponse
from app.crud.favourite_course import toggle_favourite_course, remove_favourite_course
from app.core.security import get_current_user_id
from app.models.course import Course
from app.core.database import get_session
from app.models.student import StudentProfile  # Импортируем для рекомендаций
from app.services.ai_engine import ai_service  # Твой ИИ-сервис для косинусного сходства


router = APIRouter()

@router.post("/", response_model=CourseRead)
def create_new_course(course_in: CourseCreate, session: Session = Depends(get_session)):
    return course_crud.add_course(session, course_in)

@router.get("/latest", response_model=List[CourseRead])
def read_latest_courses(session: Session = Depends(get_session)):
    """
    ЭНДПОИНТ: Получение 10 последних добавленных курсов.
    Идеально подходит для фронтенд-компонента "Свежие поступления".
    """
    # Сортируем по убыванию id (или по полю created_at, если оно у тебя есть в модели Course)
    # Если в модели Course есть created_at, замени desc(Course.id) на desc(Course.created_at)
    statement = select(Course).order_by(desc(Course.id)).limit(10)
    latest_courses = session.exec(statement).all()
    return latest_courses

@router.get("/recommendations", response_model=List[CourseRead])
def read_recommended_courses(
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Получение 10 рекомендованных курсов на основе ИИ-векторов.
    Доступен только авторизованным студентам.
    """
    # 1. Получаем профиль студента, чтобы взять его вектор интересов
    student_profile = session.exec(
        select(StudentProfile).where(StudentProfile.user_id == current_user_id)
    ).first()
    
    if not student_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль студента не найден. Рекомендации недоступны."
        )
        
    # ИСПРАВЛЕНО: Убрали 'not'. Заходим, только если вектора действительно нет (он None)
    if student_profile.interests_embedding is None:
        if student_profile.interests:
            # Превращаем список интересов обратно в строку для ИИ-модели
            interests_text = ", ".join(student_profile.interests)
            # Генерируем эмбеддинг
            student_profile.interests_embedding = ai_service.embed_text(interests_text)
            session.add(student_profile)
            session.commit()  # Сохраняем в БД
        else:
            # Если у него вообще пустые интересы — отдаем базовый топ
            return session.exec(select(Course).limit(10)).all()

    # 2. Получаем все курсы, у которых есть эмбеддинги
    # (В реальном проде лучше делать это через векторное расширение pgvector в самой БД, 
    # но для текущей отладки на небольшом датасете вытаскиваем и фильтруем через ai_service)
    all_courses = session.exec(select(Course).where(Course.embedding != None)).all()
    
    if not all_courses:
        return []

    # 3. Считаем косинусное сходство встроенными силами твоего ai_service
    # Мы передаем вектор студента и список курсов
    scored_courses = []
    for course in all_courses:
        # Предполагаем, что у твоего ai_service есть метод для расчета близости векторов
        # Например: ai_service.calculate_similarity(vec1, vec2)
        score = ai_service.get_similarity(student_profile.interests_embedding, course.embedding)
        scored_courses.append((score, course))
        
    # 4. Сортируем по коэффициенту сходства (от большего к меньшему) и берем топ-10
    scored_courses.sort(key=lambda x: x[0], reverse=True)
    recommended_courses = [course for score, course in scored_courses[:10]]
    
    return recommended_courses

@router.get("/personalized-trending", response_model=List[CourseRead])
def read_personalized_trending_courses(
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: ТОП-5 курсов, которые одновременно являются НОВЫМИ и ПОДХОДЯТ по интересам.
    Реализует гибридное ранжирование (Косинусное сходство + Коэффициент новизны).
    """
    # 1. Получаем профиль студента и проверяем эмбеддинг интересов
    student_profile = session.exec(
        select(StudentProfile).where(StudentProfile.user_id == current_user_id)
    ).first()
    
    if not student_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль студента не найден."
        )
        
    # Генерируем эмбеддинг, если он отсутствует, но есть текстовые интересы
    if student_profile.interests_embedding is None:
        if student_profile.interests:
            interests_text = ", ".join(student_profile.interests)
            student_profile.interests_embedding = ai_service.embed_text(interests_text)
            session.add(student_profile)
            session.commit()
        else:
            # Если интересов нет, отдаем просто 5 последних созданных курсов
            return session.exec(select(Course).order_by(desc(Course.id)).limit(5)).all()

    # 2. Получаем курсы с валидными эмбеддингами
    all_courses = session.exec(select(Course).where(Course.embedding != None)).all()
    if not all_courses:
        return []

    # 3. Находим Мин и Макс ID для нормализации новизны (Min-Max Normalization)
    all_ids = [c.id for c in all_courses]
    min_id = min(all_ids)
    max_id = max(all_ids)
    id_range = max_id - min_id if max_id != min_id else 1

    # 4. Веса для кастомизации гибридного поиска (в сумме дают 1.0)
    WEIGHT_SIMILARITY = 0.6  # Насколько важны интересы (60%)
    WEIGHT_RECENCY = 0.4     # Насколько важна новизна (40%)

    scored_courses = []
    for course in all_courses:
        # Считаем семантическое сходство (обычно от 0.0 до 1.0)
        similarity = ai_service.get_similarity(student_profile.interests_embedding, course.embedding)
        
        # Нормализуем новизну: чем ближе ID к максимальному, тем ближе значение к 1.0
        # (Если у тебя есть поле created_at, здесь можно считать разницу в днях)
        recency = (course.id - min_id) / id_range
        
        # Вычисляем финальный гибридный скор
        final_score = (similarity * WEIGHT_SIMILARITY) + (recency * WEIGHT_RECENCY)
        
        scored_courses.append((final_score, course))

    # 5. Сортируем по финальному скору сверху вниз и забираем ровно 5 элементов для баннеров
    scored_courses.sort(key=lambda x: x[0], reverse=True)
    trending_courses = [course for score, course in scored_courses[:5]]

    return trending_courses

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

