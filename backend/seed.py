import json
from sqlmodel import Session, create_engine, select
from init_db import Course, model, engine # Импортируем твои настройки

def seed_courses():
    # 1. Загружаем данные из файла
    with open("courses.json", "r", encoding="utf-8") as f:
        courses_data = json.load(f)

    with Session(engine) as session:
        for item in courses_data:
            # Проверяем, нет ли уже такого курса в базе (по названию)
            statement = select(Course).where(Course.title == item["title"])
            existing = session.exec(statement).first()
            
            if not existing:
                print(f"⏳ Генерируем вектор для: {item['title']}...")
                # Генерируем вектор через FastEmbed
                embedding = list(model.embed([item["description"]]))[0]
                
                new_course = Course(
                    title=item["title"],
                    description=item["description"],
                    embedding=embedding.tolist()
                )
                session.add(new_course)
                print(f"✅ Добавлен: {item['title']}")
            else:
                print(f"⏩ Пропуск (уже есть): {item['title']}")
        
        session.commit()
        print("\n🚀 База данных синхронизирована!")

if __name__ == "__main__":
    seed_courses()