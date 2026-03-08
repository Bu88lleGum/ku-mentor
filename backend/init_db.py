import numpy as np
from sqlmodel import SQLModel, Field, create_engine, Session, Column
from pgvector.sqlalchemy import Vector
from fastembed import TextEmbedding
from typing import List, Optional

# 1. Описываем модель данных для KU Mentor
class Course(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    # Поле для вектора (384 измерения для нашей мультиязычной модели)
    embedding: List[float] = Field(sa_column=Column(Vector(384)))

# 2. Подключаемся к твоему Docker (порт 5433)
# Логин: postgres, Пароль: qwerty
DATABASE_URL = "postgresql+psycopg://postgres:qwerty@localhost:5433/postgres"
engine = create_engine(DATABASE_URL)

# 3. Инициализируем нейросеть (модель)
model = TextEmbedding(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

def main():
    # Создаем таблицы в базе данных
    SQLModel.metadata.create_all(engine)
    print("✅ Таблица 'course' создана или уже существует.")

    # Твои данные для проекта
    data = [
        {"title": "Python для начинающих", "desc": "Основы программирования и синтаксиса Python."},
        {"title": "Мәліметтер базасы", "desc": "SQL және реляциялық деректер базасымен жұмыс."},
        {"title": "AI & Machine Learning", "desc": "Introduction to neural networks and vector search."}
    ]

    titles = [item["title"] for item in data]
    descriptions = [item["desc"] for item in data]

    # Генерируем векторы (сразу для всех описаний)
    embeddings = list(model.embed(descriptions))

    # Сохраняем всё в базу
    with Session(engine) as session:
        for i in range(len(data)):
            course = Course(
                title=titles[i],
                description=descriptions[i],
                embedding=embeddings[i].tolist() # Превращаем numpy-массив в список
            )
            session.add(course)
        
        session.commit()
        print(f"🚀 Успешно сохранено {len(data)} курса(ов) в базу!")

if __name__ == "__main__":
    main()