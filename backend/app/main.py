from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import recommendations_router, users_router, auth_router, skill_router, course_router, studentcource_router, searchhistory_router

app = FastAPI(title="KU Mentor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем модули (роутеры)
app.include_router(recommendations_router, prefix="/recommend", tags=["Recommendations"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(skill_router, prefix="/skill", tags=["Skill"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(course_router, prefix="/course", tags=["Course"])
app.include_router(studentcource_router, prefix="/studentcource", tags=["Student Cource"])
app.include_router(searchhistory_router, prefix="/searchhistory", tags=["Search History"])


@app.get("/health")
def health_check():
    return {"status": "online", "engine": "FastEmbed - Multilingual"}