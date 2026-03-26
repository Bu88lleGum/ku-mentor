from sqlmodel import Session, select
from app.models.course import Course
from app.models.category import Category
from app.schemas.course import CourseCreate
from app.services.ai_engine import ai_service

def add_course(session: Session, course_in: CourseCreate) -> Course:
    # 1. Получаем объекты категорий из БД
    db_categories = []
    if course_in.category_ids:
        statement = select(Category).where(Category.id.in_(course_in.category_ids))
        db_categories = session.exec(statement).all()

    # 2. Генерируем вектор через AI Service
    # Передаем объекты категорий, чтобы AI учитывал их названия в векторе
    vector = ai_service.create_embedding(
        title=course_in.title,
        description=course_in.description,
        categories=db_categories
    )

    # 3. Создаем объект курса (пока без категорий)
    db_course = Course(
        title=course_in.title,
        description=course_in.description,
        sourceUrl=str(course_in.sourceUrl) if course_in.sourceUrl else None,
        provider_id=course_in.provider_id,
        embedding=vector
    )
    
    # 4. Привязываем категории (SQLModel сама заполнит CourseCategory)
    db_course.categories = db_categories

    session.add(db_course)
    session.commit()
    session.refresh(db_course)
    return db_course

def get_courses(session: Session, skip: int = 0, limit: int = 20):
    # Используем select(Course), подгрузка категорий произойдет автоматически 
    # благодаря Relationship в модели
    statement = select(Course).offset(skip).limit(limit)
    return session.exec(statement).all()