# это тестовый файл запускать не обязательно

from sqlmodel import Session, create_engine, select
from pgvector.sqlalchemy import Vector
from fastembed import TextEmbedding
from init_db import Course, engine, model # Используем настройки из прошлого файла

def search_courses(query_text: str, limit: int = 1):
    # 1. Превращаем запрос пользователя в вектор
    query_vector = list(model.embed([query_text]))[0]

    with Session(engine) as session:
        # 2. Делаем запрос к базе: сортируем по дистанции (L2 distance <->)
        # Чем меньше расстояние, тем больше сходство
        statement = (
            select(Course)
            .order_by(Course.embedding.l2_distance(query_vector))
            .limit(limit)
        )
        
        results = session.exec(statement).all()
        
        print(f"\n🔍 Запрос пользователя: '{query_text}'")
        print("-" * 30)
        for course in results:
            print(f"🎯 Рекомендация: {course.title}")
            print(f"📖 Описание: {course.description}")

if __name__ == "__main__":
    # Попробуй поискать на разных языках!
    i = input("Write something: ")
    search_courses(i, limit=1)
    search_courses("Хочу изучать нейросети", limit=1)
    search_courses("Деректер базасы туралы", limit=1) # О базе данных на казахском