import os
from sqlmodel import create_engine, SQLModel, Session
from sqlalchemy import text
from typing import Generator

# Проверяем, задана ли переменная в системе/докере. 
# Если нет — берем локальный порт 5433 для Windows.
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+psycopg://postgres:qwerty@localhost:5436/postgres"
)

engine = create_engine(DATABASE_URL)

def init_db():
    # 1. Гарантируем, что расширение векторного поиска включено
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
        
    print("🚀 Расширение pgvector успешно активировано!")

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session