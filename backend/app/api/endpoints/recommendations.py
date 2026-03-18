from fastapi import APIRouter, Query, HTTPException, Depends
from sqlmodel import Session, select
from app.core.database import get_session
from app.models import Course
from app.services.ai_engine import ai_service
from app.schemas import RecommendationResponse
from app.core.security import get_current_user_id
import logging

router = APIRouter()

@router.get("/", response_model=RecommendationResponse)
def get_recommendations(
    user_query: str = Query(..., min_length=3),
    session: Session = Depends(get_session), # Внедряем сессию здесь
    current_user_id: int = Depends(get_current_user_id) # ЗАЩИТА ТУТ
):
    try:
        # Теперь ты точно знаешь, КТО делает запрос (current_user_id)
        print(f"Пользователь {current_user_id} ищет рекомендации {user_query}")
        query_text = f"{user_query}. {user_query}. {user_query}."
        query_vector = ai_service.create_embedding(
            title=query_text, 
            description="", 
            categories=[]
        )

        statement = (
            select(Course)
            .order_by(Course.embedding.cosine_distance(query_vector))
            .limit(3)
        )
        results = session.exec(statement).all()

        return RecommendationResponse(
            query=user_query,
            results=results
        )
        
    except Exception as e:
        logging.error(f"Recommendation Error: {e}")
        raise HTTPException(status_code=500, detail="Ошибка поиска рекомендаций")