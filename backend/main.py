from fastapi import FastAPI, Query
from sqlmodel import Session, select
from init_db import Course, engine, model # Используем уже созданные подключения
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="KU Mentor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Адрес твоего Next.js
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/recommend")
def get_recommendation(user_query: str = Query(..., description="Запрос студента")):
    # 1. Генерируем вектор из запроса
    query_vector = list(model.embed([user_query]))[0]

    with Session(engine) as session:
        # 2. Ищем 3 самых подходящих курса
        statement = (
            select(Course)
            .order_by(Course.embedding.l2_distance(query_vector))
            .limit(3)
        )
        results = session.exec(statement).all()

    # 3. Возвращаем чистый JSON (без векторов, они фронтенду не нужны)
    return [
        {"id": c.id, "title": c.title, "description": c.description} 
        for c in results
    ]