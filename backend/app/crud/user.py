from sqlalchemy.orm import selectinload
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
        role=user_in.role
    )
    session.add(new_user)
    session.flush() 

    # 2. Создаем пустой профиль
    if user_in.role == UserRole.STUDENT:
        profile = StudentProfile(user_id=new_user.id)
        session.add(profile)
    elif user_in.role == UserRole.EMPLOYER:
        profile = EmployerProfile(user_id=new_user.id, company_name=f"Компания {new_user.username}")
        session.add(profile)

    session.commit()
    
    # 3. КРИТИЧНО: Используем загрузку связей перед возвратом
    # Это гарантирует, что UserRead увидит student_profile
    return get_user_with_profile(session, new_user.id)

def get_user_by_email(session: Session, email: str):
    # Здесь тоже стоит подгружать профиль, если этот метод используется для логина/профиля
    statement = (
        select(User)
        .where(User.email == email)
        .options(selectinload(User.student_profile)) # Подгружаем сразу
    )
    return session.exec(statement).first()

def get_user_with_profile(session: Session, user_id: int) -> User | None:
    # Выносим общую логику получения юзера с профилем
    statement = (
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.student_profile))
    )
    return session.exec(statement).first()