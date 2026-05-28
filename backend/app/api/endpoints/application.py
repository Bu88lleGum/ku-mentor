from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.application import Application
from app.models.vacancy import Vacancy
from app.models.student import StudentProfile
from app.schemas.application import ApplicationRead, ApplicationCreate
from app.core.security import get_current_user_id
from app.crud.application import create_application
from app.schemas.application import IncomingApplicationRead
from app.models.employer import EmployerProfile
from sqlalchemy.orm import joinedload 
from app.schemas.application import DetailedApplicationRead, ApplicationStatusUpdate

# Инициализируем роутер для обработки запросов, связанных с откликами (Applications)
router = APIRouter()


@router.post("/", response_model=ApplicationRead)
def apply_to_vacancy(
    app_in: ApplicationCreate,
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id) # Защищенный роут: получаем ID текущего авторизованного юзера
):
    """
    ЭНДПОИНТ: Создание отклика студента на вакансию (Кнопка 'Откликнуться').
    """
    # 1. По текущему user_id ищем профиль студента в БД (базовый юзер -> профиль студента)
    student = session.exec(select(StudentProfile).where(StudentProfile.user_id == current_user_id)).first()
    
    # 2. Если профиль не найден (например, залогинен работодатель), блокируем действие
    if not student:
        raise HTTPException(status_code=403, detail="Только студенты могут откликаться")
    
    # 3. Вызываем CRUD функцию, которая считает Match Score через эмбеддинги и сохраняет отклик
    return create_application(session, student.id, app_in)


@router.get("/my", response_model=list[ApplicationRead])
def get_my_applications(
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Получение списка ВСЕХ откликов текущего студента (Личный кабинет студента).
    """
    # 1. Проверяем, что закупщик запроса является студентом
    student = session.exec(select(StudentProfile).where(StudentProfile.user_id == current_user_id)).first()
    if not student:
        raise HTTPException(status_code=403, detail="Только студенты имеют доступ к откликам")
    
    # 2. Формируем жадную загрузку (Eager Loading): подтягиваем отклик, 
    # сразу к нему привязываем вакансию, а к вакансии — профиль работодателя (избегаем проблемы N+1 запросов).
    statement = (
        select(Application)
        .where(Application.student_id == student.id)
        .options(
            joinedload(Application.vacancy)  # Загружаем вакансию
            .joinedload(Vacancy.employer)    # Цепочкой загружаем работодателя этой вакансии
        )
    )
    
    results = session.exec(statement).all()
    return results


@router.get("/incoming", response_model=list[IncomingApplicationRead])
def get_incoming_applications(
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Получение списка входящих откликов для конкретного работодателя.
    Используется для построения общей таблицы "Входящие заявки" в кабинете компании.
    """
    # 1. Проверяем, что текущий пользователь имеет профиль работодателя
    employer = session.exec(
        select(EmployerProfile).where(EmployerProfile.user_id == current_user_id)
    ).first()
    
    if not employer:
        raise HTTPException(status_code=403, detail="Доступно только для работодателей")

    # 2. Запрашиваем из БД отклики только на те вакансии, которые принадлежат этому работодателю.
    # joinedload подгружает данные студента и связанные данные аккаунта (User) для вывода имени.
    statement = (
        select(Application)
        .join(Application.vacancy)
        .where(Application.vacancy.property.mapper.class_.employer_id == employer.id)
        .options(
            joinedload(Application.vacancy),
            joinedload(Application.student).joinedload(StudentProfile.user) # Подгружаем юзера студента
        )
    )
    
    applications = session.exec(statement).all()

    # 3. Трансформируем (маппим) данные в плоскую структуру, удобную для отображения на фронтенде    formatted_apps = []
    formatted_apps = []
    for app in applications:
        # Извлекаем имя пользователя из связанной сущности User (fallback на ID, если нет связи)
        student_user = app.student.user if app.student else None
        student_name = student_user.username if student_user else f"Студент #{app.student_id}"
        
        formatted_apps.append({
            "id": app.id,
            "vacancy_id": app.vacancy_id,
            "status": app.status,
            "created_at": app.created_at,
            "student_name": student_name,
            "vacancy_title": app.vacancy.title if app.vacancy else f"Вакансия #{app.vacancy_id}",
            "cover_letter": app.cover_letter
        })

    return formatted_apps


@router.get("/{id}", response_model=DetailedApplicationRead)
def get_application_details(
    id: int,
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Детальный просмотр одной конкретной заявки по её ID.
    Доступен либо автору отклика (студенту), либо владельцу вакансии (работодателю).
    """
    # 1. Ищем отклик в базе со всеми потрохами (вакансия, работодатель, студент, юзер студента)
    statement = (
        select(Application)
        .where(Application.id == id)
        .options(
            joinedload(Application.vacancy),
            joinedload(Application.student).joinedload(StudentProfile.user)
        )
    )
    db_app = session.exec(statement).first()
    
    # Если отклика с таким ID нет вообще — отдаем 404
    if not db_app:
        raise HTTPException(status_code=404, detail="Отклик не найден")

    # 2. КРИТИЧЕСКИЙ БЛОК БЕЗОПАСНОСТИ:
    # Проверяем, принадлежит ли этот отклик текущему студенту
    is_author_student = db_app.student.user_id == current_user_id if db_app.student else False
    # Проверяем, создана ли вакансия текущим работодателем
    is_target_employer = db_app.vacancy.employer.user_id == current_user_id if db_app.vacancy and db_app.vacancy.employer else False

    # Если юзер не автор и не работодатель — выкидываем ошибку (защита от кражи чужих данных)
    if not (is_author_student or is_target_employer):
        raise HTTPException(status_code=403, detail="У вас нет прав на просмотр этого отклика")

    # 3. Собираем объект информации о студенте, включая GPA и интересы (навыки)
    student_user = db_app.student.user if db_app.student else None
    student_info = None
    
    if db_app.student and student_user:
        student_info = {
            "username": student_user.username,
            "email": student_user.email,
            "gpa": db_app.student.gpa,
            "interests": db_app.student.interests or [] # если interests == None, отдаем пустой массив
        }

    # 4. Возвращаем структурированный ответ, который ожидает фронтенд Next.js
    return {
        "id": db_app.id,
        "vacancy_id": db_app.vacancy_id,
        "vacancy_title": db_app.vacancy.title if db_app.vacancy else f"Вакансия #{db_app.vacancy_id}",
        "cover_letter": db_app.cover_letter,
        "status": db_app.status,
        "match_score": db_app.match_score,
        "created_at": db_app.created_at,
        "student": student_info
    }


@router.patch("/{id}", response_model=ApplicationRead)
def update_application_status(
    id: int,
    status_update: ApplicationStatusUpdate, # Валидирует входящий JSON (например: {"status": "ACCEPTED"})
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Изменение статуса отклика (Принять / Отклонить). 
    Вызывается работодателем на странице детального просмотра заявки.
    """
    # 1. Проверяем, что операцию выполняет пользователь со статусом Работодателя
    employer = session.exec(
        select(EmployerProfile).where(EmployerProfile.user_id == current_user_id)
    ).first()
    if not employer:
        raise HTTPException(status_code=403, detail="Только работодатели могут изменять статус отклика")

    # 2. Находим отклик в базе данных и цепляем связанную вакансию
    statement = select(Application).where(Application.id == id).options(joinedload(Application.vacancy))
    db_app = session.exec(statement).first()
    
    if not db_app:
        raise HTTPException(status_code=404, detail="Отклик не найден")

    # 3. ЗАЩИТА: Проверяем, что вакансия этого отклика принадлежит ИМЕННО ЭТОМУ работодателю
    if db_app.vacancy.employer_id != employer.id:
        raise HTTPException(status_code=403, detail="Вы не можете изменять отклики на чужие вакансии")

    # 4. Обновляем статус в объекте модели (значение берется из Enum схем)
    db_app.status = status_update.status
    
    # 5. Фиксируем изменения в базе данных и обновляем объект
    session.add(db_app)
    session.commit()
    session.refresh(db_app)
    
    return db_app