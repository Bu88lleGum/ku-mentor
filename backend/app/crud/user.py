from sqlalchemy.orm import selectinload
from sqlmodel import Session, select
from app.models import User, StudentProfile, EmployerProfile
from app.models.enums import UserRole
from app.schemas import UserCreate
from app.core.security import hash_password 

def create_new_user(session: Session, user_in: UserCreate) -> User:
    """
    ФУНКЦИЯ: Регистрация нового пользователя.
    Создает запись в таблице User и автоматически инициализирует пустой профиль 
    (студента или работодателя) в зависимости от выбранной роли.
    """
    # 1. Создаем базовую учетную запись пользователя.
    # Пароль обязательно хэшируем перед сохранением в базу данных.
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        role=user_in.role
    )
    session.add(new_user)

    # КРИТИЧЕСКИ ВАЖНО: session.flush() отправляет SQL-запрос INSERT в базу данных прямо сейчас,
    # не закрывая транзакцию (без commit). Это позволяет базе данных сгенерировать 
    # автоматический ID (new_user.id), который нам критически нужен ниже для привязки профилей.
    session.flush()

    # 2. Создаем соответствующий профиль в зависимости от роли (UserRole)
    if user_in.role == UserRole.STUDENT:
        # Для студента создаем дефолтный пустой профиль с нулевым GPA
        profile = StudentProfile(
            user_id=new_user.id, # Привязываем к только что созданному юзеру
            gpa=0.0,
            interests=[]
        )
        session.add(profile)
        
    elif user_in.role == UserRole.EMPLOYER:
        # Для работодателя подтягиваем данные компании из схемы. 
        # Если название не указано, делаем красивый фоллбек на основе юзернейма.
        profile = EmployerProfile(
            user_id=new_user.id, 
            company_name=user_in.company_name or f"Компания {new_user.username}",
            industry=user_in.industry,
            region=user_in.region
        )
        session.add(profile)

    # Жестко сохраняем всю цепочку (User + Профиль) одной транзакцией в БД
    session.commit()
    
    # 3. Возвращаем созданного пользователя, но уже с подгруженными связями профиля
    return get_user_with_profile(session, new_user.id)


def get_user_by_email(session: Session, email: str) -> User | None:
    """
    ФУНКЦИЯ: Поиск пользователя по Email (используется при Аутентификации / Логине).
    """
    # ОПТИМИЗАЦИЯ: selectinload — это стратегия жадной загрузки (Eager Loading).
    # SQLAlchemy сделает два быстрых дополнительных запроса через оператор IN (для student_profile и employer_profile).
    # Благодаря этому при авторизации объект User сразу будет содержать в себе профили, 
    # и системе не придется делать повторные запросы к БД при генерации JWT-токена.
    statement = (
        select(User)
        .where(User.email == email)
        .options(
            selectinload(User.student_profile),
            selectinload(User.employer_profile)
        )
    )
    return session.exec(statement).first()


def get_user_with_profile(session: Session, user_id: int) -> User | None:
    """
    ФУНКЦИЯ: Универсальное получение пользователя по его ID со всеми профилями.
    Используется для отдачи данных в эндпоинте /me (профиль текущего пользователя).
    """
    # Аналогично методу по email, подтягиваем связи через selectinload, 
    # чтобы избежать проблемы N+1 запросов при обращении к user.student_profile в коде.
    statement = (
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.student_profile),
            selectinload(User.employer_profile)
        )
    )
    return session.exec(statement).first()


def delete_user_by_id(session: Session, user_id: int) -> bool:
    """
    ФУНКЦИЯ: Полное удаление пользователя и всей его персональной информации из системы.
    """
    # 1. Ищем самого пользователя в таблице User
    statement = select(User).where(User.id == user_id)
    user = session.exec(statement).first()
    
    # Если пользователя с таким ID нет, сразу возвращаем False
    if not user:
        return False
    
    # 2. СТРАХОВКА / РУЧНАЯ ОЧИСТКА СВЯЗЕЙ:
    # Если на уровне СУБД для внешних ключей (FK) случайно забыли прописать ON DELETE CASCADE,
    # удаление пользователя вызовет ошибку Foreign Key Violation. 
    # Этот блок вручную зачищает дочерние таблицы перед удалением родителя.

    # Ищем и удаляем профиль студента, если он существует
    student_statement = select(StudentProfile).where(StudentProfile.user_id == user_id)
    student_profile = session.exec(student_statement).first()
    if student_profile:
        session.delete(student_profile)
        
    # Ищем и удаляем профиль работодателя, если он существует
    employer_statement = select(EmployerProfile).where(EmployerProfile.user_id == user_id)
    employer_profile = session.exec(employer_statement).first()
    if employer_profile:
        session.delete(employer_profile)

    # 3. После того как все связанные зависимые профили удалены, безопасно удаляем саму запись User
    session.delete(user)
    
    # Применяем изменения и окончательно стираем данные из диска БД    
    session.commit()
    return True