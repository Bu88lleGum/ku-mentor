from sqlmodel import Session, select
from app.models import User, StudentProfile
from app.models.enums import UserRole
from app.schemas import UserCreate
from app.core.security import hash_password 

def create_new_student(session: Session, user_in: UserCreate) -> User:
    # 1. Создаем объект пользователя
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        role=UserRole.STUDENT
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    # 2. Создаем связанный профиль
    profile = StudentProfile(user_id=new_user.id)
    session.add(profile)
    session.commit()
    
    return new_user

def get_user_by_email(session: Session, email: str):
    return session.exec(select(User).where(User.email == email)).first()