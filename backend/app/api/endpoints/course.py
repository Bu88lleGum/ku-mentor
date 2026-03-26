from fastapi import APIRouter, Depends, Query
from typing import List
from sqlmodel import Session
from app.core.database import get_session
from app.schemas.course import CourseCreate, CourseRead
from app.crud import course as course_crud

router = APIRouter()

@router.post("/", response_model=CourseRead)
def create_new_course(course_in: CourseCreate, session: Session = Depends(get_session)):
    return course_crud.add_course(session, course_in)

@router.get("/", response_model=List[CourseRead])
def read_courses(
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = Query(default=20, le=100) # Ограничиваем максимум 100 за раз
):
    return course_crud.get_courses(session, skip=skip, limit=limit)