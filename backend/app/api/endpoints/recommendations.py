from fastapi import APIRouter, Query, HTTPException, Depends
from sqlmodel import Session, select
from typing import Optional, List
from app.core.database import get_session
from app.models import Course, Vacancy
from app.services.ai_engine import ai_service
from app.schemas.vacancy import RecommendationResponse 
from app.core.security import get_current_user_id
from app.crud.searchhistory import save_search_query
import logging
from sqlalchemy.orm import selectinload

# Инициализируем роутер для интеллектуального поиска и рекомендаций (на базе эмбеддингов)
router = APIRouter()

@router.get("/", response_model=RecommendationResponse)
def get_recommendations(
    user_query: str = Query(..., min_length=3), # Поисковый запрос, минимум 3 символа
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id) # Защищаем роут, получаем ID пользователя
):
    """
    ЭНДПОИНТ: Семантический ИИ-поиск образовательных курсов по текстовому запросу.
    Ищет курсы, подходящие по смыслу, даже если нет точного совпадения по словам.
    """
    try:
        # 1. СОХРАНЕНИЕ ИСТОРИИ: Записываем, что именно искал пользователь
        save_search_query(session, current_user_id, user_query)
        
        # 2. ПОДГОТОВКА ТЕКСТА: Искусственно дублируем строку запроса.
        # Это старый трюк для легковесных LLM/эмбеддеров, чтобы заставить модель 
        # обратить больше внимания на контекст короткого поискового фрейма.
        query_text = f"{user_query}. {user_query}. {user_query}."
        
        # Генерируем числовой вектор (List[float]) через нашу ИИ-службу
        query_vector = ai_service.create_embedding(
            query_text, 
            "", 
            []
        )

    # 3. ВЕКТОРНЫЙ ПОИСК В БД: 
        # Ищем курсы, вычисляя косинусное расстояние между вектором запроса и вектором курса.
        # Чем меньше расстояние (cosine_distance), тем ближе тексты по смыслу.
        # selectinload подгружает связанные категории отдельным быстрым запросом (профилактика N+1).
        statement = (
            select(Course)
            .options(selectinload(Course.categories)) 
            .order_by(Course.embedding.cosine_distance(query_vector)) # Сортировка: от самых релевантных к менее
            .limit(5) # Ограничиваем выдачу топ-5 результатами
        )
        
        results = session.exec(statement).all()

        # 4. Формируем и возвращаем Pydantic-ответ
        return RecommendationResponse(
            query=user_query,
            results=results
        )
        
    except Exception as e:
        # Безопасность данных: если упал ИИ-сервис или поиск, откатываем транзакцию (включая запись истории)
        session.rollback() 
        logging.error(f"Recommendation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка поиска: {str(e)}")
    

@router.get("/vacancies", response_model=RecommendationResponse)
def get_recommendations(
    user_query: str = Query(..., min_length=3),
    is_internship: Optional[bool] = Query(None), # Опциональный жесткий фильтр: стажировка (True/False)
    location: Optional[str] = Query(None), # Опциональный жесткий фильтр: город/локация
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Гибридный поиск вакансий. 
    Комбинирует жесткие SQL-фильтры (город, стажировка) и мягкую ИИ-сортировку по смыслу.
    """
    # 1. ИЗОЛИРОВАННОЕ СОХРАНЕНИЕ ИСТОРИИ:
    # Оборачиваем запись истории в отдельный try/except. Если база данных заблокируется
    # или выдаст ошибку на этом этапе, мы делаем rollback только для истории.
    # Главное — не ломать пользователю сам поиск из-за упавшей аналитики!
    try:
        save_search_query(session, current_user_id, user_query)
    except Exception as history_err:
        session.rollback() # Сбрасываем незавершенную транзакцию истории
        logging.warning(f"Не удалось сохранить историю поиска для user_id {current_user_id}: {history_err}")

    # Основной блок генерации эмбеддингов и фильтрации вакансий
    try:
        # 2. ВЕКТОРНЫЙ АНАЛИЗ: Переводим поисковый запрос в векторное представление
        query_text = f"{user_query}. {user_query}. {user_query}."
        query_vector = ai_service.create_embedding(query_text, "", [])

        # 3. СБОРКА БАЗОВОГО ЗАПРОСА: Выбираем вакансии и сразу подгружаем их связи (навыки/скиллы)
        statement = select(Vacancy).options(selectinload(Vacancy.skill_links))

        # 4. ДИНАМИЧЕСКАЯ ФИЛЬТРАЦИЯ (ЖЕСТКИЕ СТРОГИЕ КРИТЕРИИ):
        # Если передан флаг стажировки, строго отсекаем неподходящие строки на уровне СУБД
        if is_internship is not None:
            statement = statement.where(Vacancy.is_internship == is_internship)
            
        # Если передан город, делаем регистронезависимый поиск по подстроке (ilike)
        # Конструкция %значение% находит совпадения внутри строки (например, "Алматы" найдет в "г. Алматы, офис")
        if location and location.strip():
            statement = statement.where(Vacancy.location.ilike(f"%{location.strip()}%"))

        # 5. СЕМАНТИЧЕСКОЕРАНЖИРОВАНИЕ (ВЕКТОРНАЯ СОРТИРОВКА):
        # Из тех вакансий, которые прошли жесткие фильтры (город + стажировка),
        # мы выбираем ТОП-5 самых близких по смыслу к текстовому запросу пользователя.
        statement = (
            statement
            .order_by(Vacancy.embedding.cosine_distance(query_vector))
            .limit(5)
        )
        
        # Выполняем финальный скомпилированный SQL-запрос
        results = session.exec(statement).all()

        # 6. Возвращаем валидированный результат на фронтенд
        return RecommendationResponse(
            query=user_query,
            results=results
        )
        
    except Exception as e:
        # В случае критической ошибки (например, лег сервер эмбеддингов) — откатываемся и логируем
        session.rollback() 
        logging.error(f"Vacancy Recommendation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка поиска вакансий: {str(e)}")