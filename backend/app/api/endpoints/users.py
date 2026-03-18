from fastapi import APIRouter, HTTPException, Depends 
from sqlmodel import Session, select
from app.core.database import get_session
from app.models import User, StudentProfile, StudentSkill, EmployerProfile
from app.schemas import UserCreate, UserRead, ProfileUpdate, EmployerProfileUpdate
from app.crud import user as user_crud

router = APIRouter()

@router.post("/register", response_model=UserRead)
def register_user(user_in: UserCreate, session: Session = Depends(get_session)):
    # Проверяем через CRUD
    if user_crud.get_user_by_email(session, user_in.email):
        raise HTTPException(status_code=400, detail="Email уже занят")
    
    # Создаем через CRUD
    return user_crud.create_new_user(session, user_in)

@router.patch("/{user_id}/complete-student", response_model=UserRead)
def complete_student_profile(
    user_id: int, 
    profile_data: ProfileUpdate, 
    session: Session = Depends(get_session)
):
    statement = select(StudentProfile).where(StudentProfile.user_id == user_id)
    profile = session.exec(statement).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль студента не найден")

    # Обновляем GPA, только если он передан
    if profile_data.gpa is not None:
        profile.gpa = profile_data.gpa

    # Обновляем интересы, только если они переданы
    if profile_data.interests is not None:
        profile.interests = profile_data.interests

    # Обновляем скиллы, только если передан список ID
    if profile_data.skill_ids is not None:
        # Очищаем старые связи
        old_skills = session.exec(
            select(StudentSkill).where(StudentSkill.student_id == profile.id)
        ).all()
        for s in old_skills:
            session.delete(s)

        # Добавляем новые
        for s_id in profile_data.skill_ids:
            new_link = StudentSkill(student_id=profile.id, skill_id=s_id, level=1)
            session.add(new_link)

    session.add(profile)
    session.commit()
    session.refresh(profile)
    
    return session.get(User, user_id)

@router.patch("/{user_id}/complete-employer", response_model=UserRead)
def complete_employer_profile(
    user_id: int, 
    profile_data: EmployerProfileUpdate, 
    session: Session = Depends(get_session)
):
    statement = select(EmployerProfile).where(EmployerProfile.user_id == user_id)
    profile = session.exec(statement).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль работодателя не найден")

    # Обновляем данные компании
    if profile_data.company_name is not None:
        profile.company_name = profile_data.company_name
    if profile_data.industry is not None:
        profile.industry = profile_data.industry
    if profile_data.region is not None:
        profile.region = profile_data.region

    session.add(profile)
    session.commit()
    return session.get(User, user_id)