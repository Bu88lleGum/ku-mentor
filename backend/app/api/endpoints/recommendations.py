from fastapi import APIRouter, Query, HTTPException, Depends
from sqlmodel import Session, select
from app.core.database import get_session
from app.models import Course
from app.services.ai_engine import ai_service
from app.schemas.course import RecommendationResponse # Уточнил путь к схеме
from app.core.security import get_current_user_id
from app.crud.searchhistory import save_search_query # Проверь название файла
import logging
from sqlalchemy.orm import selectinload

router = APIRouter()

@router.get("/", response_model=RecommendationResponse)
def get_recommendations(
    user_query: str = Query(..., min_length=3),
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    try:
        # 1. Сохраняем в историю (Важно: до или после поиска)
        # Мы используем user_query напрямую
        save_search_query(session, current_user_id, user_query)
        
        # 2. Подготовка текста для эмбеддинга
        # Дублирование текста (f"{user_query}. {user_query}...") иногда помогает 
        # маленьким моделям лучше "понять" короткий запрос. Оставляем.
        query_text = f"{user_query}. {user_query}. {user_query}."
        
        query_vector = ai_service.create_embedding(
            query_text, 
            "", 
            []
        )

        # 3. Поиск в БД с использованием векторного расстояния
        statement = (
            select(Course)
            .options(selectinload(Course.categories)) 
            .order_by(Course.embedding.cosine_distance(query_vector))
            .limit(5)
        )
        
        results = session.exec(statement).all()

        # 4. Формируем ответ
        return RecommendationResponse(
            query=user_query,
            results=results
        )
        
    except Exception as e:
        # Важно: откатываем транзакцию, если сохранение истории или поиск упали
        session.rollback() 
        logging.error(f"Recommendation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка поиска: {str(e)}")