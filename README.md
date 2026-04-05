## 🔑 Инструкция для Фронтенда

### 1. Авторизация (Login)
Для доступа к защищенным эндпоинтам (например, рекомендации) нужно получить токен.
* **URL:** `POST /auth/login`
* **Формат данных:** `Content-Type: application/x-www-form-urlencoded`
* **Поля:** `username` (твой email) и `password`.
* **Что придет в ответ:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1Ni...",
  "token_type": "bearer"
}
```

### 2. Как делать запросы к защищенным API
При каждом запросе к /recommend/ добавляй токен в заголовок Authorization:
Authorization: Bearer <твой_access_token>

### 3. Эндпоинты
* **POST /users/register** — регистрация нового студента.

* **GET /recommend/** — поиск курсов. Параметр user_query (мин. 3 символа).

* **GET /health** — проверка статуса сервера.

# KU Mentor — AI-Driven Academic Recommendation System

**KU Mentor** is an intelligent assistant designed for university students. It utilizes semantic vector search to match student interests with relevant courses, extracurricular activities, and career paths, moving beyond simple keyword matching to understand user intent.

## 🧠 How It Works
1. **Embedding:** The system converts course descriptions into 384-dimensional vectors using `FastEmbed`.
2. **Vector Storage:** These embeddings are stored in PostgreSQL via `pgvector`.
3. **Semantic Search:** When a user enters a query, the system vectorizes it and calculates the **Cosine Distance** between the query and the stored courses to find the most relevant matches.
---

## 🏗 System Architecture & Tech Stack

### Core Technologies
- **Backend:** Python 3.10+ / FastAPI
- **Database:** PostgreSQL with `pgvector` extension and Alembic
- **ORM:** SQLModel (SQLAlchemy + Pydantic)
- **AI/ML Engine:** FastEmbed (Sentence-Transformers)
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Deployment:** Docker & Docker Compose

---

## 🚀 Installation & Deployment Guide

Follow these steps to synchronize the environment and launch the application.

### 1. Repository Initialization
Clone the repository and enter the project directory:
```bash
git clone https://github.com/Bu88lleGum/ku-mentor.git
cd ku-mentor
```

### 2. Database Orchestration (Docker)
The system requires a PostgreSQL instance with the pgvector extension. Ensure Docker Desktop is running, then execute:

```bash
docker-compose up -d
```
The database will be initialized and exposed on port 5433.

### 3. Backend Setup & API Launch
1) Navigate to the backend directory:

```bash
cd backend
```
2) Create and activate a Python virtual environment:

```bash
python -m venv venv
.\venv\Scripts\activate
```
3) Install required dependencies:

```bash
pip install -r requirements.txt
```

4) Start the FastAPI development server:

```bash
uvicorn app.main:app --reload
```
The API documentation will be available at http://127.0.0.1:8000/docs.

### 4. 🛠 Database Management (Alembic)
This project uses Alembic for database migrations. This allows us to evolve the database schema (add columns, change types) without losing existing data.
#### 1. Initial Setup
1) Ensure the Docker container is running:
```bash
docker-compose up -d
```
2) Apply all existing migrations to create tables:

```bash
cd backend
alembic upgrade head
```

3) Data Synchronization (Seeding)
Before using the search features, populate your local database with initial course data and generate embeddings:
```bash
python seed.py
```
This script will read courses.json, generate vectors via FastEmbed, and store them in your Docker-based PostgreSQL.

#### 2. How to Modify the Database
If you add a new field or a new table in models.py:

1) Generate a migration script:

```bash
alembic revision --autogenerate -m "description_of_changes"
```
2) Verify the generated file in migrations/versions/.

3) Apply changes to the DB:
```bash
alembic upgrade head
```

#### 3. Useful Commands
- **alembic history** --verbose – View the history of all changes.

- **alembic current** – Check the current version of your database.

- **alembic downgrade -1** – Revert the last applied migration.
### 5. Frontend Setup
Open a new terminal session and navigate to the frontend directory:

```bash
cd frontend
```
Install Node.js dependencies:

```bash
npm install
```
Launch the Next.js development server:

```bash
npm run dev
```
The application interface will be accessible at http://localhost:3000.

## 📂 Project Structure
/backend — API endpoints, embedding generation logic, and database schemas.
- **├── ai_engine.py**    # AI Model initialization (FastEmbed)
- **├── database.py**     # Connection logic & DB initialization
- **├── models.py**       # SQLModel schemas (Course, etc.)
- **├── main.py**         # FastAPI endpoints & logic
- **├── seed.py**         # Data seeding & vectorization script
- **├── courses.json**    # Source data for courses
- **└── requirements.txt**

/frontend — User interface components and client-side integration.

docker-compose.yml — Multi-container configuration for the database environment.

.gitignore — Configuration to exclude environment-specific files (venv, node_modules).

## 🛠 Roadmap
[ ] Implement automated university course data ingestion.

[ ] Add advanced filtering by department and difficulty levels.

[ ] Integrate local job market vacancy mapping.

[ ] Develop a personalized student profile dashboard.

## 👥 Contributors:

- **Konstantin Permin** ([@Bu88lleGum][konst-link]) — Backend & AI Integration, Database, ORM, Deployment
- **Venom** ([@tea-ervi][venom-link]) — Frontend, UI-UX Design

[konst-link]: https://github.com/Bu88lleGum
[venom-link]: https://github.com/tea-ervi