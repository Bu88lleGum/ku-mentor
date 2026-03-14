from fastapi import APIRouter, HTTPException, Depends 
from sqlmodel import Session, select
from app.core.database import get_session
from app.models import User, StudentProfile
from app.models.enums import UserRole
from app.schemas import UserCreate, UserRead 
from app.crud import user as user_crud

router = APIRouter()

from app.crud import user as user_crud

@router.post("/register", response_model=UserRead)
def register_user(user_in: UserCreate, session: Session = Depends(get_session)):
    # Проверяем через CRUD
    if user_crud.get_user_by_email(session, user_in.email):
        raise HTTPException(status_code=400, detail="Email уже занят")
    
    # Создаем через CRUD
    return user_crud.create_new_student(session, user_in)