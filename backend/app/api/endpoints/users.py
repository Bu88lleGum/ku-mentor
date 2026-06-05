from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from app.core.database import get_session
from app.models import User, StudentProfile, StudentSkill, EmployerProfile
from app.schemas.user import UserCreate, UserRead, ProfileUpdate, EmployerProfileUpdate
from app.crud import user as user_crud
from app.core.security import get_current_user_id, create_access_token
from app.services.ai_engine import ai_service
from app.crud.user import delete_user_by_id
from app.schemas.user import UserRegisterResponse
from app.schemas.course import CourseRead
from app.schemas.vacancy import VacancyRead
from app.crud.favourite_course import get_user_favourite_courses
from app.crud.favourite_vacancy import get_user_favourite_vacancies
from typing import List

# Инициализируем роутер для управления аккаунтами, авторизацией и профилями
router = APIRouter()


@router.post("/register", response_model=UserRegisterResponse)
def register_user(user_in: UserCreate, session: Session = Depends(get_session)):
    """
    ЭНДПОИНТ: Регистрация нового пользователя.
    После успешного создания аккаунта сразу генерирует и возвращает JWT-токен,
    чтобы пользователю не приходилось логиниться повторно.
    """
    # 1. Проверяем уникальность Email. Если такой уже есть в БД — прерываем регистрацию
    if user_crud.get_user_by_email(session, user_in.email):
        raise HTTPException(status_code=400, detail="Email уже занят")
    
    # 2. Создаем базового пользователя в БД (внутри CRUD также хэшируется пароль 
    # и автоматически создается пустой StudentProfile или EmployerProfile в зависимости от роли)
    new_user = user_crud.create_new_user(session, user_in)
    
    # 3. Автоматический вход: генерируем JWT-токен для свежесозданного пользователя.
    # В поле "sub" (subject) записываем ID пользователя в виде строки — это стандарт JWT.
    access_token = create_access_token(data={"sub": str(new_user.id)})
    
    # 4. Возвращаем структуру согласно схеме UserRegisterResponse (токен + данные юзера)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }


@router.get("/me", response_model=UserRead)
def get_my_profile(
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id) # Извлекает ID из JWT-токена в заголовке Authorization
):
    """
    ЭНДПОИНТ: Получение данных профиля текущего залогиненного пользователя.
    Используется фронтендом при обновлении страницы для проверки авторизации и роли (Студент/Работодатель).
    """
    # Запрашиваем юзера вместе с его профилем (жадная загрузка через selectinload внутри CRUD)
    user = user_crud.get_user_with_profile(session, current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user

@router.patch("/complete-student", response_model=UserRead)
def complete_student_profile(
    profile_data: ProfileUpdate, 
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id) # Защита: редактировать можно только свой профиль
):
    """
    ЭНДПОИНТ: Заполнение/обновление профиля студента (GPA, текстовые интересы, навыки-теги).
    Здесь происходит магия подготовки данных для AI-матчинга.
    """
    # Находим существующий профиль студента, привязанный к текущему пользователю
    statement = select(StudentProfile).where(StudentProfile.user_id == current_user_id)
    profile = session.exec(statement).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль студента не найден")

    # 1. Обновляем GPA (если передано в JSON-боди)
    if profile_data.gpa is not None:
        profile.gpa = profile_data.gpa
        
    # 2. Обновляем ИНТЕРЕСЫ и генерируем векторный ЭМБЕДДИНГ для AI
    if profile_data.interests is not None:
        profile.interests = profile_data.interests
        
        # Переводим массив тегов-интересов (напр. ["Python", "FastAPI"]) в единую строку: "Python, FastAPI"
        # Это необходимо, так как нейросеть принимает на вход чистый текст.
        interests_text = ", ".join(profile_data.interests)
        
        # Вызываем локальный или внешний AI-сервис для получения математического вектора (лин. алгебра)
        vector = ai_service.embed_text(interests_text)
        
        if vector: # Записываем вектор в базу (массив float[]) только при успешной генерации
            profile.interests_embedding = vector

    # 3. Обновляем навыки (Связующая таблица Many-to-Many: StudentSkill)
    if profile_data.skill_ids is not None:
        from sqlmodel import delete
        # Чтобы не высчитывать разницу (какие навыки добавились, какие удалились),
        # мы сначала полностью ОЧИЩАЕМ старые привязки студента к скиллам в БД
        session.execute(delete(StudentSkill).where(StudentSkill.student_id == profile.id))

        # Накатываем новые связи из пришедшего массива ID навыков
        for s_id in profile_data.skill_ids:
            if s_id == 0: # Защита от дефолтных пустых значений фронтенда
                continue
            # Создаем запись в промежуточной таблице (уровень владения навыком по умолчанию = 1)
            new_link = StudentSkill(student_id=profile.id, skill_id=s_id, level=1)
            session.add(new_link)

    # Добавляем обновленный профиль в сессию
    session.add(profile)
    
    try:
        session.commit() # Сохраняем всё одним транзакционным блоком
    except Exception as e:
        session.rollback() # В случае ошибки (например, если передали несуществующий skill_id), откатываем изменения
        raise HTTPException(status_code=400, detail=f"Ошибка базы данных: проверьте skill_ids. {str(e)}")
    
    # Возвращаем актуальные данные пользователя вместе с вложенным профилем обратно фронтенду
    return user_crud.get_user_with_profile(session, current_user_id)


@router.patch("/complete-employer")
def complete_employer_profile(
    profile_data: EmployerProfileUpdate,
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Заполнение/обновление карточки компании работодателя.
    """
    # 1. Находим профиль работодателя, созданный автоматически при регистрации базового юзера
    statement = select(EmployerProfile).where(EmployerProfile.user_id == current_user_id)
    profile = session.exec(statement).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль работодателя не найден"
        )
    
    # 2. Переносим валидированные данные из Pydantic-схемы в модель базы данных SQLAlchemy
    profile.company_name = profile_data.company_name
    profile.industry = profile_data.industry
    profile.region = profile_data.region
    
    # 3. Фиксируем изменения в БД и обновляем состояние объекта    session.add(profile)
    session.commit()
    session.refresh(profile)
    
    # 4. Возвращаем плоский кастомный словарь для подтверждения успеха на фронтенде
    return {
        "status": "success",
        "employer_id": profile.id,
        "company_name": profile.company_name,
        "industry": profile.industry,
        "region": profile.region
    }


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Полное удаление аккаунта пользователя из системы.
    """
    # БЕЗОПАСНОСТЬ: Проверяем, что ID в URL совпадает с ID в токене. 
    # Обычный пользователь не может удалить чужой аккаунт, подменив id в строке запроса.
    if current_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="У вас нет прав на удаление этого аккаунта"
        )
        
    # Вызываем CRUD операцию (внутри БД настроено каскадное удаление ON DELETE CASCADE,
    # поэтому связанные профили, отклики и навыки сотрутся автоматически)
    success = delete_user_by_id(session=session, user_id=user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
        
    # Возвращаем статус 204 No Content. Спецификация HTTP требует, чтобы у 204 ответов отсутствовало тело (body)
    return None


@router.get("/me/favourite-courses", response_model=List[CourseRead])
def get_my_favourite_courses(
    skip: int = 0, 
    limit: int = 20, 
    session: Session = Depends(get_session), 
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Получение списка всех обучающих курсов, которые текущий пользователь добавил в избранное.
    """
    return get_user_favourite_courses(
        session=session, 
        user_id=current_user_id, 
        skip=skip, 
        limit=limit
    )


@router.get("/me/favourite-vacancies", response_model=List[VacancyRead])
def get_my_favourite_vacancies(
    skip: int = 0, 
    limit: int = 20, 
    session: Session = Depends(get_session), 
    current_user_id: int = Depends(get_current_user_id)
):
    """
    ЭНДПОИНТ: Получение списка всех вакансий, которые текущий пользователь сохранил в закладки.
    """
    return get_user_favourite_vacancies(
        session=session, 
        user_id=current_user_id, 
        skip=skip, 
        limit=limit
    )