import numpy as np
from sqlmodel import SQLModel, Field, create_engine, Session, Column
from pgvector.sqlalchemy import Vector
from fastembed import TextEmbedding
from typing import List, Optional
from sqlalchemy import text  # <-- ДОБАВЬ ЭТОТ ИМПОРТ

# 1. Описываем модель данных для KU Mentor
class Course(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    embedding: List[float] = Field(sa_column=Column(Vector(384)))

# 2. Подключаемся (порт 5433)
DATABASE_URL = "postgresql+psycopg://postgres:qwerty@localhost:5433/postgres"
engine = create_engine(DATABASE_URL)

# 3. Инициализируем нейросеть
model = TextEmbedding(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

def main():
    # --- НОВЫЙ БЛОК: АКТИВАЦИЯ PGVECTOR ---
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    print("✅ Расширение pgvector активировано.")
    # --------------------------------------

    # Создаем таблицы
    SQLModel.metadata.create_all(engine)
    print("✅ Таблица 'course' создана или уже существует.")

    # Твои данные
    data = [
        {"title": "Python для начинающих", "desc": "Основы программирования и синтаксиса Python."},
        {"title": "Мәліметтер базасы", "desc": "SQL және реляциялық деректер базасымен жұмыс."},
        {"title": "AI & Machine Learning", "desc": "Introduction to neural networks and vector search."},
        {"title": "Advanced Web Development", "desc": "Introduction to Netx js framework, working with TailwindCss."}
    ]

    descriptions = [item["desc"] for item in data]
    embeddings = list(model.embed(descriptions))

    # Сохраняем в базу
    with Session(engine) as session:
        for i in range(len(data)):
            course = Course(
                title=data[i]["title"],
                description=data[i]["desc"],
                embedding=embeddings[i].tolist()
            )
            session.add(course)
        
        session.commit()
        print(f"🚀 Успешно сохранено {len(data)} курса(ов) в базу!")

if __name__ == "__main__":
    main()