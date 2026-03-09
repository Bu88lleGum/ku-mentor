import json
from sqlmodel import Session, select
from database import engine, init_db
from models import Course
from ai_engine import model

def seed_courses():
    # Сначала убедимся, что таблицы созданы
    init_db()

    with open("courses.json", "r", encoding="utf-8") as f:
        courses_data = json.load(f)

    with Session(engine) as session:
        for item in courses_data:
            existing = session.exec(select(Course).where(Course.title == item["title"])).first()
            
            if not existing:
                print(f"⏳ Векторизация: {item['title']}...")
                embedding = list(model.embed([item["description"]]))[0]
                
                new_course = Course(
                    title=item["title"],
                    description=item["description"],
                    embedding=embedding.tolist()
                )
                session.add(new_course)
            else:
                print(f"⏩ Пропуск: {item['title']}")
        
        session.commit()
        print("🚀 Синхронизация завершена!")

if __name__ == "__main__":
    seed_courses()