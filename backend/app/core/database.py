from sqlmodel import create_engine, SQLModel, Session
from sqlalchemy import text
from typing import Generator

DATABASE_URL = "postgresql+psycopg://postgres:qwerty@localhost:5433/postgres"
engine = create_engine(DATABASE_URL)

def init_db():
    with engine.connect() as conn:
        # Это расширение должно быть в базе ДО запуска миграций Alembic
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    # SQLModel.metadata.create_all(engine)  <-- Эту строку можно закомментировать/удалить
# Новая функция для внедрения зависимостей
def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session