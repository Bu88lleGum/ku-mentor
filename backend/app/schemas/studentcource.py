from pydantic import BaseModel
from datetime import datetime
from app.models.enums import CourseStatus

# При добавлении курса студенту
class StudentCourseCreate(BaseModel):
    course_id: int
    status: CourseStatus = CourseStatus.IN_PROGRESS

# При обновлении статуса (например, когда курс пройден)
class StudentCourseUpdate(BaseModel):
    status: CourseStatus

# Для ответа (Read)
class StudentCourseRead(BaseModel):
    id: int
    course_id: int
    status: CourseStatus
    added_at: datetime

    class Config:
        from_attributes = True