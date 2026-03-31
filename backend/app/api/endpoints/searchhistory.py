from fastapi import APIRouter, Depends
from app.core.database import get_session
from app.core.security import get_current_user_id
from app.schemas.searchhistory import SearchHistoryRead
from app.crud.searchhistory import get_user_history
from typing import List
from sqlmodel import Session


router = APIRouter()

@router.get("/history", response_model=List[SearchHistoryRead])
def read_my_history(
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    return get_user_history(session, current_user_id)

# Мы не делаем отдельный POST для истории. 
# Логика сохранения должна быть ВНУТРИ твоего основного эндпоинта /recommend