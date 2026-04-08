from sqlmodel import Session, select
from app.models.application import Application
from app.models.student import StudentProfile
from app.models.vacancy import Vacancy
from app.schemas.application import ApplicationCreate
from app.models.enums import ApplicationStatus
import numpy as np

def create_application(session: Session, student_id: int, app_in: ApplicationCreate):
    # 1. Достаем профили для расчета матчинга
    student = session.exec(select(StudentProfile).where(StudentProfile.id == student_id)).first()
    vacancy = session.exec(select(Vacancy).where(Vacancy.id == app_in.vacancy_id)).first()
    
    # 2. Считаем Match Score (косинусное сходство векторов)
    score = 0.0
    if student.interests_embedding is not None and vacancy.embedding is not None:
        v1 = np.array(student.interests_embedding)
        v2 = np.array(vacancy.embedding)
        score = float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))

    # 3. Создаем запись
    db_app = Application(
        **app_in.model_dump(),
        student_id=student_id,
        match_score=round(score, 2),
        status=ApplicationStatus.PENDING
    )
    session.add(db_app)
    session.commit()
    session.refresh(db_app)
    return db_app