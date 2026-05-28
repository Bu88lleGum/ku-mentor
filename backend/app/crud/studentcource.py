from sqlmodel import Session, select
from app.models import StudentCourse, Course
from app.schemas.studentcource import StudentCourseCreate, CourseStatus

def add_course_to_student(session: Session, student_id: int, course_in: StudentCourseCreate):
    """
    ФУНКЦИЯ: Привязка курса к студенту (Запись на курс / Добавление в личный трек).
    """
    # 1. Создаем экземпляр модели StudentCourse, распаковывая данные из схемы и добавляя ID студента
    db_obj = StudentCourse(
        student_id=student_id,
        course_id=course_in.course_id,
        status=course_in.status # Статус (например: "IN_PROGRESS", "COMPLETED")
    )
    # 2. Помещаем объект в сессию для отслеживания изменений
    session.add(db_obj)
    # 3. Фиксируем транзакцию в базе данных (сохраняем запись)
    session.commit()
    # 4. Обновляем объект, чтобы подтянуть сгенерированные БД поля (например, автоматический id или added_at)
    session.refresh(db_obj)
    return db_obj


def get_student_courses(session: Session, student_id: int):
    """
    ФУНКЦИЯ: Получение списка всех курсов конкретного студента с названиями этих курсов.
    """
    # 1. Строим SQL-запрос: выбираем саму связь (StudentCourse) и ТОЛЬКО название курса (Course.title).
    # Делаем JOIN таблицы Course по совпадению внешнего ключа и фильтруем по ID студента.
    statement = select(StudentCourse, Course.title).join(Course, StudentCourse.course_id == Course.id).where(StudentCourse.student_id == student_id)
    
    # 2. Выполняем запрос. Вернется список кортежей вида: [(StudentCourse_1, "Название_1"), (StudentCourse_2, "Название_2")]
    results = session.exec(statement).all()

    # 3. Маппим (преобразуем) тяжелые объекты SQLAlchemy/SQLModel в легкую "плоскую" структуру словарей для фронтенда
    return [
        {
            "id": student_course.id,
            "course_id": student_course.course_id,
            "course_name": course_title,  # Передаем название курса наружу вместо сырого ID
            "status": student_course.status,
            "added_at": student_course.added_at
        }
        # Распаковываем каждый кортеж из результатов запроса
        for student_course, course_title in results
    ]

def update_course_status(session: Session, student_id: int, course_id: int, new_status: CourseStatus):
    """
    ФУНКЦИЯ: Обновление статуса прохождения курса у конкретного студента.
    """
    # 1. Ищем конкретную запись, где совпадают одновременно и ID студента, и ID курса
    statement = select(StudentCourse).where(
        StudentCourse.student_id == student_id,
        StudentCourse.course_id == course_id
    )
    db_obj = session.exec(statement).first()

    # 2. Если запись найдена, обновляем поле статуса и сохраняем изменения в БД
    if db_obj:
        db_obj.status = new_status # Присваиваем новое значение валидированного Enum
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj) # Обновляем объект для возврата актуального состояния
        
    # Если запись не найдена, вернется None (обработку ошибки 404 можно сделать выше в роутере)
    return db_obj