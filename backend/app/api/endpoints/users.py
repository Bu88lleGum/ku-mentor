from fastapi import APIRouter, HTTPException, Depends 
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload # Добавь импорт
from app.core.database import get_session
from app.models import User, StudentProfile, StudentSkill, EmployerProfile
from app.schemas.user import UserCreate, UserRead, ProfileUpdate, EmployerProfileUpdate
from app.crud import user as user_crud
from app.core.security import get_current_user_id # Добавь защиту
from app.services.ai_engine import ai_service
router = APIRouter()

@router.post("/register", response_model=UserRead)
def register_user(user_in: UserCreate, session: Session = Depends(get_session)):
    if user_crud.get_user_by_email(session, user_in.email):
        raise HTTPException(status_code=400, detail="Email уже занят")
    return user_crud.create_new_user(session, user_in)

# Добавим эндпоинт /me, про который говорили
@router.get("/me", response_model=UserRead)
def get_my_profile(
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    user = user_crud.get_user_with_profile(session, current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user

@router.patch("/complete-student", response_model=UserRead)
def complete_student_profile(
    profile_data: ProfileUpdate, 
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    statement = select(StudentProfile).where(StudentProfile.user_id == current_user_id)
    profile = session.exec(statement).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль студента не найден")

    # 1. Обновляем GPA (без изменений)
    if profile_data.gpa is not None:
        profile.gpa = profile_data.gpa
        
    # 2. Обновляем ИНТЕРЕСЫ и генерируем ЭМБЕДДИНГ
    if profile_data.interests is not None:
        profile.interests = profile_data.interests
        
        # Склеиваем массив ["Python", "FastAPI"] в строку "Python, FastAPI"
        interests_text = ", ".join(profile_data.interests)
        
        # Обращаемся к нашему AI движку для генерации вектора
        vector = ai_service.embed_text(interests_text)
        
        if vector: # Сохраняем, только если вектор успешно сгенерировался
            profile.interests_embedding = vector

    # 3. Обновляем скиллы (без изменений)
    if profile_data.skill_ids is not None:
        from sqlmodel import delete
        session.execute(delete(StudentSkill).where(StudentSkill.student_id == profile.id))

        for s_id in profile_data.skill_ids:
            if s_id == 0: 
                continue
            new_link = StudentSkill(student_id=profile.id, skill_id=s_id, level=1)
            session.add(new_link)

    session.add(profile)
    
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Ошибка базы данных: проверьте skill_ids. {str(e)}")
    
    return user_crud.get_user_with_profile(session, current_user_id)

@router.patch("/complete-employer", response_model=UserRead)
def complete_employer_profile(
    profile_data: EmployerProfileUpdate, 
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    statement = select(EmployerProfile).where(EmployerProfile.user_id == current_user_id)
    profile = session.exec(statement).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль работодателя не найден")

    if profile_data.company_name:
        profile.company_name = profile_data.company_name
    if profile_data.industry:
        profile.industry = profile_data.industry
    if profile_data.region:
        profile.region = profile_data.region

    session.add(profile)
    session.commit()
    
    return user_crud.get_user_with_profile(session, current_user_id)