from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.security import get_current_user_id
from app.models import StudentProfile, StudentCourse
from app.schemas.studentcource import StudentCourseCreate, StudentCourseRead, StudentCourseUpdate
from app.crud.studentcource import add_course_to_student, get_student_courses, update_course_status

router = APIRouter()

# Вспомогательная функция для получения ID профиля студента по ID юзера
def get_student_id(session: Session, user_id: int):
    profile = session.exec(select(StudentProfile).where(StudentProfile.user_id == user_id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль студента не найден")
    return profile.id

@router.post("/my-courses", response_model=StudentCourseRead)
def enroll_in_course(
    course_in: StudentCourseCreate,
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    student_id = get_student_id(session, current_user_id)
    # Проверка: не записан ли уже студент на этот курс
    existing = session.exec(select(StudentCourse).where(
        StudentCourse.student_id == student_id, 
        StudentCourse.course_id == course_in.course_id
    )).first()
    if existing:
        raise HTTPException(status_code=400, detail="Вы уже записаны на этот курс")
        
    return add_course_to_student(session, student_id, course_in)

@router.get("/my-courses", response_model=list[StudentCourseRead])
def read_my_courses(
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    student_id = get_student_id(session, current_user_id)
    return get_student_courses(session, student_id)

@router.patch("/my-courses/{course_id}", response_model=StudentCourseRead)
def change_status(
    course_id: int,
    update_data: StudentCourseUpdate,
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    student_id = get_student_id(session, current_user_id)
    updated = update_course_status(session, student_id, course_id, update_data.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Запись о курсе не найдена")
    return updated