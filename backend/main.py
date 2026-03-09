from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from database import engine
from models import Course
from ai_engine import model
import logging

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="KU Mentor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/recommend")
def get_recommendation(user_query: str = Query(..., min_length=3)):
    try:
        # Превращаем запрос студента в вектор
        query_vector = list(model.embed([user_query]))[0]

        with Session(engine) as session:
            # Ищем топ-3 курса по косинусному сходству
            statement = (
                select(Course)
                .order_by(Course.embedding.cosine_distance(query_vector))
                .limit(3)
            )
            results = session.exec(statement).all()

        return [
            {"id": c.id, "title": c.title, "description": c.description} 
            for c in results
        ]
    except Exception as e:
        logging.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Database search error")

@app.get("/health")
def health_check():
    return {"status": "online", "model": "paraphrase-multilingual"}