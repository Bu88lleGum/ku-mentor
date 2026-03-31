from sqlmodel import Session, select
from app.models import SearchHistory
from app.services.ai_engine import ai_service

def save_search_query(session: Session, user_id: int, query_text: str):
    # Генерируем вектор для текста запроса
    vector = ai_service.create_embedding(query_text) 
    
    db_obj = SearchHistory(
        user_id=user_id,
        query_text=query_text,
        query_embedding=vector
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj

def get_user_history(session: Session, user_id: int, limit: int = 10):
    statement = (
        select(SearchHistory)
        .where(SearchHistory.user_id == user_id)
        .order_by(SearchHistory.created_at.desc())
        .limit(limit)
    )
    return session.exec(statement).all()