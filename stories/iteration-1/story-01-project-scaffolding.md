# Story 1: Project Scaffolding & Dev Environment

| Field                | Details               |
| -------------------- | --------------------- |
| **Iteration**        | 1 — Foundation        |
| **Story #**          | 1 of 24               |
| **Priority**         | 🔴 Critical           |
| **Depends On**       | None (starting point) |
| **Blocks**           | All other stories     |
| **Estimated Effort** | 1–2 days              |

---

## User Story

**As a** developer,  
**I want** a fully configured project structure with backend and frontend scaffolds,  
**So that** all future work builds on a consistent, well-organized foundation.

---

## Description

This is the very first story. Nothing else can proceed until the project skeleton is in place. We establish:

1. The **backend** FastAPI project with a clean folder structure, configuration management, and a working health endpoint.
2. The **frontend** React project (via Vite) with routing, API client setup, and a basic health check page.
3. The **database** connection via SQLAlchemy + Alembic migrations.
4. The **development environment** with Docker Compose for external services (PostgreSQL).

---

## Backend Tasks

### 1.1 — Initialize Python Project

- [x] Create `backend/` directory at project root
- [x] Create `pyproject.toml` (or `requirements.txt`) with initial dependencies:
  ```
  fastapi==0.110+
  uvicorn[standard]
  sqlalchemy==2.0+
  alembic
  psycopg2-binary
  pydantic-settings
  python-dotenv
  ```
- [x] Create a Python virtual environment (`python -m venv venv`)
- [x] Install all dependencies

### 1.2 — Create Folder Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                # FastAPI app initialization + lifespan
│   ├── config.py              # Settings via pydantic-settings
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── router.py     # v1 API router aggregator
│   ├── models/               # SQLAlchemy ORM models
│   │   └── __init__.py
│   ├── schemas/              # Pydantic request/response schemas
│   │   └── __init__.py
│   ├── services/             # Business logic layer
│   │   └── __init__.py
│   ├── workers/              # Celery tasks (for later)
│   │   └── __init__.py
│   ├── utils/                # Helper functions
│   │   └── __init__.py
│   └── db/
│       ├── __init__.py
│       ├── base.py           # SQLAlchemy Base class
│       ├── session.py        # DB session factory & dependency
│       └── migrations/       # Alembic migrations folder
├── tests/
│   ├── __init__.py
│   └── conftest.py           # Shared test fixtures
├── .env.example
├── .env                      # Local (gitignored)
├── .gitignore
├── Dockerfile                # (stub for now)
└── README.md
```

### 1.3 — Configuration Management (`config.py`)

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Kairox"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/kairox"

    # Redis (for later)
    REDIS_URL: str = "redis://localhost:6379/0"

    # OpenAI (for later)
    OPENAI_API_KEY: str = ""

    # Auth
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

### 1.4 — FastAPI Application (`main.py`)

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect DB, Redis, etc.
    print("🚀 Kairox starting up...")
    yield
    # Shutdown: close connections
    print("👋 Kairox shutting down...")

app = FastAPI(
    title="Kairox API",
    description="AI Workflow Automation Assistant",
    version="0.1.0",
    lifespan=lifespan
)

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "app": "Kairox",
        "version": "0.1.0"
    }
```

### 1.5 — Database Setup

- [ ] Create `db/base.py`:

  ```python
  from sqlalchemy.orm import DeclarativeBase

  class Base(DeclarativeBase):
      pass
  ```

- [ ] Create `db/session.py`:

  ```python
  from sqlalchemy import create_engine
  from sqlalchemy.orm import sessionmaker
  from app.config import settings

  engine = create_engine(settings.DATABASE_URL)
  SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

  def get_db():
      db = SessionLocal()
      try:
          yield db
      finally:
          db.close()
  ```

- [ ] Initialize Alembic: `alembic init app/db/migrations`
- [ ] Configure `alembic.ini` and `env.py` to use `settings.DATABASE_URL`
- [ ] Verify Alembic can connect and generate a blank migration

### 1.6 — Environment File (`.env.example`)

```env
# Application
APP_NAME=Kairox
DEBUG=True

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/kairox

# Redis
REDIS_URL=redis://localhost:6379/0

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# Auth
SECRET_KEY=change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### 1.7 — Docker Compose (External Services)

```yaml
# docker-compose.dev.yml
version: "3.8"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: kairox
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Frontend Tasks

### 1.8 — Initialize React Project

- [x] Create `frontend/` directory at project root
- [x] Initialize Vite + React: `npx -y create-vite@latest ./ --template react`
- [x] Install dependencies:
  ```
  npm install axios react-router-dom
  ```

### 1.9 — Create Folder Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── HealthStatus.jsx
│   ├── pages/               # Page-level components
│   │   └── HealthCheckPage.jsx
│   ├── hooks/               # Custom React hooks
│   │   └── useApi.js
│   ├── services/            # API client wrappers
│   │   ├── api.js           # Axios instance + interceptors
│   │   └── healthService.js
│   ├── store/               # State management (Zustand or Context)
│   │   └── index.js
│   ├── utils/               # Helper functions
│   │   └── index.js
│   ├── styles/              # Global CSS
│   │   └── index.css
│   ├── App.jsx              # Root component + router
│   └── main.jsx             # Entry point
├── public/
├── .env.development
├── .env.production
└── vite.config.js
```

### 1.10 — API Client Setup (`services/api.js`)

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach auth token (for later)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
```

### 1.11 — Health Check Page

- [ ] Create `HealthCheckPage.jsx` that calls `GET /health`
- [ ] Display connection status with a green/red indicator
- [ ] Show API response data (app name, version)
- [ ] This page serves as proof that frontend ↔ backend communication works

### 1.12 — Vite Proxy Configuration

```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

---

## Database Tasks

### 1.13 — PostgreSQL Setup

- [ ] Option A: Run via Docker Compose (`docker-compose -f docker-compose.dev.yml up -d`)
- [ ] Option B: Install PostgreSQL locally
- [ ] Create database `kairox`
- [ ] Verify connection from SQLAlchemy

### 1.14 — Alembic Migration Config

- [ ] Configure `alembic.ini` to read `DATABASE_URL` from settings
- [ ] Update `migrations/env.py` to import `Base` metadata
- [ ] Run `alembic revision --autogenerate -m "initial"` (will be empty)
- [ ] Run `alembic upgrade head` to verify

---

## Acceptance Criteria

- [ ] `uvicorn app.main:app --reload` starts without errors
- [ ] `GET /health` returns `200 OK` with `{ status: "ok", app: "Kairox", version: "0.1.0" }`
- [ ] React dev server starts on port 3000
- [ ] Health check page renders and shows green status
- [ ] Alembic connects to PostgreSQL and can generate/run migrations
- [ ] `.env.example` is committed; `.env` is gitignored
- [ ] All folders created with proper `__init__.py` files

---

## Files Created / Modified

| File                                     | Action   | Description                    |
| ---------------------------------------- | -------- | ------------------------------ |
| `backend/app/main.py`                    | NEW      | FastAPI app entry point        |
| `backend/app/config.py`                  | NEW      | Settings via pydantic-settings |
| `backend/app/db/base.py`                 | NEW      | SQLAlchemy Base class          |
| `backend/app/db/session.py`              | NEW      | DB session factory             |
| `backend/.env.example`                   | NEW      | Environment template           |
| `frontend/src/services/api.js`           | NEW      | Axios client                   |
| `frontend/src/pages/HealthCheckPage.jsx` | NEW      | Health check UI                |
| `frontend/vite.config.js`                | MODIFIED | Proxy configuration            |
| `docker-compose.dev.yml`                 | NEW      | PostgreSQL container           |

---

## Notes

- This story has **zero business logic**. It is purely infrastructure.
- Every subsequent story will build on the structure created here.
- Take extra time to get the folder structure right — changing it later is painful.
- Use Python 3.11+ for best FastAPI compatibility.
