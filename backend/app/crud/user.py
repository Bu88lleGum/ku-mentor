from sqlmodel import Session, select
from app.models import User, StudentProfile, EmployerProfile
from app.models.enums import UserRole
from app.schemas import UserCreate
from app.core.security import hash_password 


def create_new_user(session: Session, user_in: UserCreate) -> User:
    # 1. Создаем пользователя
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        role=user_in.role # Теперь роль берется из схемы
    )
    session.add(new_user)
    session.flush() # Получаем ID юзера, но не фиксируем транзакцию

    # 2. Создаем профиль в зависимости от роли
    if user_in.role == UserRole.STUDENT:
        profile = StudentProfile(user_id=new_user.id)
        session.add(profile)
    elif user_in.role == UserRole.EMPLOYER:
        # Для работодателя создаем профиль с временным названием (потом он его сменит)
        profile = EmployerProfile(user_id=new_user.id, company_name=f"Компания {new_user.username}")
        session.add(profile)

    session.commit()
    session.refresh(new_user)
    return new_user

def get_user_by_email(session: Session, email: str):
    return session.exec(select(User).where(User.email == email)).first()