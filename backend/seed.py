import json
import os
import sys
import random
from datetime import datetime, UTC
from dotenv import load_dotenv

# 1. ЗАГРУЗКА ОКРУЖЕНИЯ (строго до импорта движка БД)
load_dotenv()

from sqlmodel import Session, select, delete
from app.core.database import engine
from app.models import (
    User, StudentProfile, EmployerProfile, Course, 
    Provider, Category, Skill, StudentSkill, 
    Vacancy, VacancySkill, FavouriteCourse, FavouriteVacancy
)
from app.models.enums import UserRole
from app.core.security import hash_password 
from app.services.ai_engine import ai_service 

def seed_all():
    print("🚀 Начинаю процесс заполнения базы данных...")
    
    # Текущее время в UTC без таймзоны для timestamp columns
    current_time = datetime.now(UTC).replace(tzinfo=None)
    
    with Session(engine) as session:
        # Общий хэшированный пароль для всех тестовых аккаунтов
        test_password_hash = hash_password("password123")
        
        # Списки ID для последующей симуляции лайков
        student_user_ids = []

        # --- 1. ЗАГРУЗКА КУРСОВ ИЗ JSON ---
        try:
            with open("data.json", "r", encoding="utf-8") as f:
                courses_data = json.load(f)
            
            print(f"📚 Обработка курсов из JSON ({len(courses_data)} шт.)...")
            for item in courses_data:
                # Провайдер
                p_name = item.get("provider", "Unknown Provider")
                db_provider = session.exec(select(Provider).where(Provider.name == p_name)).first()
                if not db_provider:
                    db_provider = Provider(name=p_name, provider_url=f"https://{p_name.lower().replace(' ', '')}.com")
                    session.add(db_provider)
                    session.flush()

                # Проверяем существование курса
                course = session.exec(select(Course).where(Course.title == item["title"])).first()
                
                if not course:
                    print(f"   📚 Векторизация нового курса: {item['title']}...")
                    new_vector = ai_service.create_embedding(
                        title=item["title"], 
                        description=item["description"], 
                        categories=item.get("categories", [])
                    )

                    course = Course(
                        title=item["title"],
                        description=item["description"],
                        provider_id=db_provider.id,
                        source_url=item.get("source_url", "https://example.com"),
                        embedding=new_vector
                    )
                    session.add(course)
                    session.flush()
                else:
                    # Если описание изменилось — пересчитываем вектор
                    if course.description != item["description"]:
                        print(f"   🔄 Описание курса '{item['title']}' изменилось! Пересчитываю вектор...")
                        new_vector = ai_service.create_embedding(
                            title=item["title"], 
                            description=item["description"], 
                            categories=item.get("categories", [])
                        )
                        course.description = item["description"]
                        course.embedding = new_vector
                    else:
                        print(f"   ✅ Курс '{item['title']}' без изменений. Векторизация пропущена.")
                
                # Обновляем категории курса
                course.categories = [] 
                for c_name in item.get("categories", []):
                    db_cat = session.exec(select(Category).where(Category.name == c_name)).first()
                    if not db_cat:
                        db_cat = Category(name=c_name)
                        session.add(db_cat)
                        session.flush()
                    course.categories.append(db_cat)

        except FileNotFoundError:
            print("⚠️ Файл data.json не найден, импорт курсов пропущен.")

        # --- 2. БАЗОВЫЕ НАВЫКИ (SKILLS) ---
        print("🛠️ Синхронизация пула навыков...")
        skills_pool = {
            "Hard Skills": ["Python", "FastAPI", "PostgreSQL", "MongoDB", "NestJS", "Docker", 
                            "JavaScript", "TypeScript", "React", "Next.js", "Tailwind CSS", 
                            "Machine Learning", "Data Analysis", "PyTorch"]
        }
        
        db_skills = {}
        for category, skills in skills_pool.items():
            for s_name in skills:
                skill = session.exec(select(Skill).where(Skill.name == s_name)).first()
                if not skill:
                    skill = Skill(name=s_name, category=category)
                    session.add(skill)
                    session.flush()
                db_skills[s_name] = skill.id

        # --- 3. ГЕНЕРАЦИЯ ПОЛЬЗОВАТЕЛЕЙ-СТУДЕНТОВ ---
        print("🎓 Проверка и создание пула студентов...")
        students_blueprints = [
            {"username": "konst_dev", "email": "konstantin@example.com", "interests": ["Backend", "AI", "Python"], "skills": ["Python", "FastAPI"]},
            {"username": "alex_backend", "email": "alex@example.com", "interests": ["Backend", "FastAPI", "PostgreSQL"], "skills": ["Python", "PostgreSQL", "Docker"]},
            {"username": "maria_js", "email": "maria@example.com", "interests": ["Frontend", "UI/UX", "React"], "skills": ["JavaScript", "React", "Tailwind CSS"]},
            {"username": "sergey_ai", "email": "sergey@example.com", "interests": ["AI", "Machine Learning", "Python"], "skills": ["Python", "Machine Learning", "Data Analysis"]},
            {"username": "dmitry_fullstack", "email": "dmitry@example.com", "interests": ["Next.js", "NestJS", "Web"], "skills": ["TypeScript", "Next.js", "NestJS"]},
        ]

        for bp in students_blueprints:
            user_st = session.exec(select(User).where(User.email == bp["email"])).first()
            if not user_st:
                print(f"   ✨ Создаю профиль студента: {bp['username']}...")
                user_st = User(
                    username=bp["username"], 
                    email=bp["email"], 
                    hashed_password=test_password_hash, 
                    role=UserRole.STUDENT,
                    created_at=current_time
                )
                session.add(user_st)
                session.flush()

                profile = StudentProfile(
                    user_id=user_st.id, 
                    gpa=4.0 if bp["username"] == "konst_dev" else round(random.uniform(3.4, 3.9), 2), 
                    interests=bp["interests"],  # Сюда теперь улетает чистый list
                    interests_embedding=None
                )
                session.add(profile)
                session.flush()

                # Добавляем навыки студенту
                for s_name in bp["skills"]:
                    if s_name in db_skills:
                        session.add(StudentSkill(student_id=profile.id, skill_id=db_skills[s_name], level=5))
            else:
                print(f"   ✅ Студент {bp['username']} уже существует.")
                # Если интересы в базе поломаны, обновляем их до нормального списочного формата
                profile = session.exec(select(StudentProfile).where(StudentProfile.user_id == user_st.id)).first()
                if profile:
                    profile.interests = bp["interests"]
                    session.add(profile)
            
            student_user_ids.append(user_st.id)

        # --- 4. РАБОТОДАТЕЛИ И ВАКАНСИИ ---
        print("🏢 Проверка и создание работодателей/вакансий...")
        employers_blueprints = [
            {"username": "kutech_hr", "email": "hr@kutech.com", "company": "KU Tech", "industry": "Education IT", "region": "North Kazakhstan"},
            {"username": "kaspi_hr", "email": "hr@kaspi.kz", "company": "Kaspi", "industry": "Fintech", "region": "Almaty"},
            {"username": "bi_recruiter", "email": "hr@bi.group", "company": "BI Group", "industry": "Construction/IT", "region": "Astana"},
        ]

        db_employers = {}
        for emp_bp in employers_blueprints:
            user_emp = session.exec(select(User).where(User.email == emp_bp["email"])).first()
            if not user_emp:
                print(f"   ✨ Создаю работодателя: {emp_bp['company']}...")
                user_emp = User(username=emp_bp["username"], email=emp_bp["email"], hashed_password=test_password_hash, role=UserRole.EMPLOYER)
                session.add(user_emp)
                session.flush()

                emp_profile = EmployerProfile(user_id=user_emp.id, company_name=emp_bp["company"], industry=emp_bp["industry"], region=emp_bp["region"])
                session.add(emp_profile)
                session.flush()
                db_employers[emp_bp["company"]] = emp_profile.id
            else:
                ep = session.exec(select(EmployerProfile).where(EmployerProfile.user_id == user_emp.id)).first()
                if ep:
                    db_employers[emp_bp["company"]] = ep.id

        vacancies_blueprints = [
            {"title": "Junior Python Developer", "desc": "Ищем начинающего разработчика на Python и FastAPI. Навыки работы с SQL.", "skills": ["Python", "FastAPI", "PostgreSQL"], "company": "KU Tech", "internship": True},
            {"title": "Middle React Engineer", "desc": "Разработка современных интерфейсов на React, Next.js и TypeScript.", "skills": ["JavaScript", "TypeScript", "React", "Next.js", "Tailwind CSS"], "company": "Kaspi", "internship": False},
            {"title": "Data Scientist (ML)", "desc": "Анализ данных, построение и обучение моделей машинного обучения на Python.", "skills": ["Python", "Machine Learning", "Data Analysis"], "company": "BI Group", "internship": False},
            {"title": "Backend Developer (NestJS)", "desc": "Разработка масштабируемых микросервисов на Node.js / NestJS и MongoDB.", "skills": ["TypeScript", "NestJS", "PostgreSQL", "MongoDB"], "company": "Kaspi", "internship": False},
            {"title": "FastAPI / Python Engineer", "desc": "Создание высоконагруженных асинхронных API на FastAPI. Использование Docker.", "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"], "company": "KU Tech", "internship": False},
        ]

        for i in range(4):
            for vac_bp in vacancies_blueprints:
                v_title = f"{vac_bp['title']} (Batch {i+1})" if i > 0 else vac_bp['title']
                v_desc = f"{vac_bp['desc']} Проектная группа {i+1}."
                
                vacancy = session.exec(select(Vacancy).where(Vacancy.title == v_title)).first()
                if not vacancy:
                    print(f"   🧠 Векторизация вакансии: {v_title}...")
                    vac_vector = ai_service.create_embedding(title=v_title, description=v_desc, categories=[])

                    vacancy = Vacancy(
                        employer_id=db_employers[vac_bp["company"]],
                        title=v_title,
                        description=v_desc,
                        requirements="Знание профильного стека, базовый технический английский.",
                        location=vac_bp["company"],
                        salary_range="180,000 - 450,000 KZT" if vac_bp["internship"] else "500,000 - 1,100,000 KZT",
                        is_internship=vac_bp["internship"],
                        embedding=vac_vector,
                        created_at=current_time
                    )
                    session.add(vacancy)
                    session.flush()

                    for s_name in vac_bp["skills"]:
                        if s_name in db_skills:
                            session.add(VacancySkill(vacancy_id=vacancy.id, skill_id=db_skills[s_name], is_required=True))
                else:
                    print(f"   ✅ Вакансия '{v_title}' уже в базе.")

        # --- 5. СИМУЛЯЦИЯ ИЗБРАННОГО (ЛАЙКОВ) ДЛЯ ИИ-ОТЛАДКИ ---
        print("⭐️ Синхронизация лайков по интересам пользователей...")
        
        if student_user_ids:
            session.execute(delete(FavouriteCourse).where(FavouriteCourse.user_id.in_(student_user_ids)))
            session.execute(delete(FavouriteVacancy).where(FavouriteVacancy.user_id.in_(student_user_ids)))
            session.flush()

        for u_id in student_user_ids:
            user_obj = session.get(User, u_id)
            
            if "konst" in user_obj.username or "backend" in user_obj.username:
                stmt_c = select(Course).where(Course.title.like("%Python%") | Course.title.like("%Backend%")).limit(3)
                stmt_v = select(Vacancy).where(Vacancy.title.like("%Python%") | Vacancy.title.like("%FastAPI%")).limit(3)
            elif "js" in user_obj.username or "fullstack" in user_obj.username:
                stmt_c = select(Course).where(Course.title.like("%React%") | Course.title.like("%JavaScript%")).limit(3)
                stmt_v = select(Vacancy).where(Vacancy.title.like("%React%") | Vacancy.title.like("%NestJS%")).limit(3)
            else:
                stmt_c = select(Course).where(Course.title.like("%Machine Learning%") | Course.title.like("%Data%")).limit(2)
                stmt_v = select(Vacancy).where(Vacancy.title.like("%Data Scientist%")).limit(2)

            for c in session.exec(stmt_c).all():
                session.add(FavouriteCourse(user_id=u_id, course_id=c.id, created_at=current_time))
            for v in session.exec(stmt_v).all():
                session.add(FavouriteVacancy(user_id=u_id, vacancy_id=v.id, created_at=current_time))

        session.commit()
        print("\n✅ Синхронизация и наполнение ИИ-датасета завершены успешно!")

if __name__ == "__main__":
    seed_all()