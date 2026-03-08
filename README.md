# KU Mentor — AI-Driven Academic Recommendation System

**KU Mentor** is an intelligent assistant designed for university students. It utilizes semantic vector search to match student interests with relevant courses, extracurricular activities, and career paths, moving beyond simple keyword matching to understand user intent.

---

## 🏗 System Architecture & Tech Stack

### Core Technologies
- **Backend:** Python 3.10+ / FastAPI
- **Database:** PostgreSQL with `pgvector` extension
- **ORM:** SQLModel (SQLAlchemy + Pydantic)
- **AI/ML Engine:** FastEmbed (Sentence-Transformers)
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS

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
Navigate to the backend directory:

```bash
cd backend
```
Create and activate a Python virtual environment:

```bash
python -m venv venv
.\venv\Scripts\activate
```
Install required dependencies:

```bash
pip install -r requirements.txt
```
Start the FastAPI development server:

```bash
fastapi dev main.py
```
The API documentation will be available at http://127.0.0.1:8000/docs.

### 4. Frontend Setup
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

/frontend — User interface components and client-side integration.

docker-compose.yml — Multi-container configuration for the database environment.

.gitignore — Configuration to exclude environment-specific files (venv, node_modules).

### 🛠 Roadmap
[ ] Implement automated university course data ingestion.

[ ] Add advanced filtering by department and difficulty levels.

[ ] Integrate local job market vacancy mapping.

[ ] Develop a personalized student profile dashboard.

### 👥 Contributors:
