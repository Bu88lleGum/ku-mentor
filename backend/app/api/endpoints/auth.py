from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session
from app.core.database import get_session
from app.core.security import verify_password, create_access_token
from app.crud.user import get_user_by_email
from fastapi.security import OAuth2PasswordRequestForm # Импортируй это!
router = APIRouter()


from fastapi.security import OAuth2PasswordRequestForm # Импортируй это!

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), # Swagger теперь пришлет данные сюда
    session: Session = Depends(get_session)
):
    # В OAuth2PasswordRequestForm email пользователя лежит в поле .username
    user = get_user_by_email(session, form_data.username)
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Неверный email или пароль")
    
    # Если всё ок, создаем токен
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {"access_token": access_token, "token_type": "bearer"}