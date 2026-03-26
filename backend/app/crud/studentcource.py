from sqlmodel import Session, select
from app.models import StudentCourse
from app.schemas.studentcource import StudentCourseCreate, CourseStatus

def add_course_to_student(session: Session, student_id: int, course_in: StudentCourseCreate):
    db_obj = StudentCourse(
        student_id=student_id,
        course_id=course_in.course_id,
        status=course_in.status
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj

def get_student_courses(session: Session, student_id: int):
    statement = select(StudentCourse).where(StudentCourse.student_id == student_id)
    return session.exec(statement).all()

def update_course_status(session: Session, student_id: int, course_id: int, new_status: CourseStatus):
    statement = select(StudentCourse).where(
        StudentCourse.student_id == student_id,
        StudentCourse.course_id == course_id
    )
    db_obj = session.exec(statement).first()
    if db_obj:
        db_obj.status = new_status
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)
    return db_obj