import json
from sqlmodel import Session, select
from app.core.database import engine
from app.models import (
    User, StudentProfile, EmployerProfile, Course, 
    Provider, Category, Skill, StudentSkill, 
    Vacancy, Application
)
from app.models.enums import UserRole
from app.services.ai_engine import ai_service # Импортируем твой экземпляр

def seed_all():
    print("🚀 Начинаю процесс заполнения базы данных...")
    
    with Session(engine) as session:
        # --- 1. ЗАГРУЗКА КУРСОВ ИЗ JSON ---
        try:
            with open("data.json", "r", encoding="utf-8") as f:
                courses_data = json.load(f)
            
            for item in courses_data:
                # Провайдер
                p_name = item.get("provider")
                db_provider = session.exec(select(Provider).where(Provider.name == p_name)).first()
                if not db_provider:
                    db_provider = Provider(name=p_name)
                    session.add(db_provider)
                    session.flush()

                # Ищем курс, чтобы обновить или создать
                course = session.exec(select(Course).where(Course.title == item["title"])).first()
                
                # Генерируем НОВЫЙ усиленный вектор (теперь передаем всё!)
                print(f"  📚 Векторизация: {item['title']}...")
                new_vector = ai_service.create_embedding(
                    title=item["title"], 
                    description=item["description"], 
                    categories=item.get("categories", [])
                )

                if not course:
                    # Создаем новый, если нет
                    course = Course(
                        title=item["title"],
                        description=item["description"],
                        provider_id=db_provider.id,
                        embedding=new_vector
                    )
                    session.add(course)
                else:
                    # ОБНОВЛЯЕМ существующий (чтобы веса наконец применились)
                    course.embedding = new_vector
                    course.description = item["description"]
                
                # Обновляем категории
                course.categories = [] # Очищаем старые связи, чтобы не дублировать
                for c_name in item.get("categories", []):
                    db_cat = session.exec(select(Category).where(Category.name == c_name)).first()
                    if not db_cat:
                        db_cat = Category(name=c_name)
                        session.add(db_cat)
                        session.flush()
                    course.categories.append(db_cat)

        except FileNotFoundError:
            print("⚠️ Файл data.json не найден, импорт курсов пропущен.")
        # --- 2. ТЕСТОВЫЙ СТУДЕНТ ---
        student_email = "konstantin@example.com"
        if not session.exec(select(User).where(User.email == student_email)).first():
            print("  🎓 Создаю профиль студента...")
            user_st = User(username="konst_dev", email=student_email, hashed_password="123", role=UserRole.STUDENT)
            session.add(user_st)
            session.commit() # Фиксируем User для ID

            profile = StudentProfile(user_id=user_st.id, gpa=4.0, interests=["Backend", "AI"])
            session.add(profile)
            session.flush()

            # Добавляем навык
            skill = Skill(name="Python", category="Hard Skills")
            session.add(skill)
            session.flush()
            session.add(StudentSkill(student_id=profile.id, skill_id=skill.id, level=5))

        # --- 3. ТЕСТОВЫЙ РАБОТОДАТЕЛЬ И ВАКАНСИЯ ---
        emp_email = "hr@kutech.com"
        if not session.exec(select(User).where(User.email == emp_email)).first():
            print("  🏢 Создаю работодателя и вакансию...")
            user_emp = User(username="kutech_hr", email=emp_email, hashed_password="123", role=UserRole.EMPLOYER)
            session.add(user_emp)
            session.commit()

            emp_profile = EmployerProfile(user_id=user_emp.id, company_name="KU Tech")
            session.add(emp_profile)
            session.flush()

            vacancy_text = "Нужен Python разработчик со знанием FastAPI."
            vacancy = Vacancy(
                employer_id=emp_profile.id,
                title="Python Developer",
                description=vacancy_text,
                # Было: embedding=ai_service.create_embedding(vacancy_text)
                # Нужно (передаем текст вакансии в title, остальное пустое):
                embedding=ai_service.create_embedding(title=vacancy_text, description="", categories=[])
            )
            session.add(vacancy)

        session.commit()
        print("\n✅ Синхронизация завершена успешно!")

if __name__ == "__main__":
    seed_all()