from sqlmodel import create_engine, SQLModel
from sqlalchemy import text

DATABASE_URL = "postgresql+psycopg://postgres:qwerty@localhost:5433/postgres"
engine = create_engine(DATABASE_URL)

def init_db():
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    SQLModel.metadata.create_all(engine)