from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user_id
from app.core.database import get_session
from app.crud.vacancy import create_vacancy, get_employer_vacancies
from app.schemas.vacancy import VacancyCreate, VacancyRead
from app.models import EmployerProfile
from typing import List
from sqlmodel import select, Session

router = APIRouter()

@router.post("/", response_model=VacancyRead)
def add_new_vacancy(
    vacancy_in: VacancyCreate,
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    # Тут должна быть проверка: является ли юзер работодателем?
    employer_profile = session.exec(select(EmployerProfile).where(EmployerProfile.user_id == current_user_id)).first()
    if not employer_profile:
        raise HTTPException(status_code=403, detail="Только работодатель может создавать вакансии")

    return create_vacancy(session, employer_profile.id, vacancy_in)

@router.get("/my", response_model=List[VacancyRead])
def read_my_vacancies(
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    employer_profile = session.exec(select(EmployerProfile).where(EmployerProfile.user_id == current_user_id)).first()
    return get_employer_vacancies(session, employer_profile.id)