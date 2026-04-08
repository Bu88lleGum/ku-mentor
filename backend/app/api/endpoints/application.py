from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.application import Application
from app.models.student import StudentProfile
from app.schemas.application import ApplicationRead, ApplicationCreate
from app.core.security import get_current_user_id
from app.crud.application import create_application

router = APIRouter()

@router.post("/", response_model=ApplicationRead)
def apply_to_vacancy(
    app_in: ApplicationCreate,
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    # Находим ID профиля студента по userID
    student = session.exec(select(StudentProfile).where(StudentProfile.user_id == current_user_id)).first()
    if not student:
        raise HTTPException(status_code=403, detail="Только студенты могут откликаться")
    
    return create_application(session, student.id, app_in)

@router.get("/my", response_model=list[ApplicationRead])
def get_my_applications(
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    student = session.exec(select(StudentProfile).where(StudentProfile.user_id == current_user_id)).first()
    return session.exec(select(Application).where(Application.student_id == student.id)).all()