# Kairox

Kairox turns a natural-language thought into an editable, dependency-aware task
plan. Submit a thought, let the backend process it asynchronously, then review
the resulting tasks in an expandable graph grouped by the original input.

## What it does

- Accepts natural-language input and creates tasks using the configured Ollama
  model.
- Stores each submitted thought and its tasks as a separate workflow.
- Represents task prerequisites with persisted dependency relationships.
- Prevents a task from being marked complete while any prerequisite is
  incomplete.
- Provides task status, priority, due-date, editing, reminder, and deletion
  APIs.
- Presents task graphs, task details, and a timeline in a React interface.
- Uses Celery and Redis to process submitted thoughts outside the API request.

## Technology

- **Frontend:** React, Vite, Tailwind CSS
- **API:** FastAPI
- **Persistence:** PostgreSQL, SQLAlchemy, Alembic
- **Background jobs and cache:** Celery and Redis
- **Task extraction:** Ollama-compatible chat API
- **Python tooling:** uv

## Repository layout

```text
backend/
  app/
    api/                 FastAPI routes
    cache/               Redis cache client and helpers
    db/                  SQLAlchemy session and Alembic migrations
    models/              Users, raw inputs, tasks, dependencies, reminders
    services/             Business logic
    workers/              Celery app and background tasks
  llm/                   Prompt and LLM integration
  tests/                 Backend tests
frontend/
  src/                   React application
  package.json            Frontend scripts and dependencies
docs/
  celery-guide.md         Celery worker setup and operations
```

## Prerequisites

- Python 3.14 or newer
- [uv](https://docs.astral.sh/uv/)
- Node.js and npm compatible with the Vite version in `frontend/package.json`
- Docker with Docker Compose, or a separately running Redis server
- PostgreSQL
- Ollama running locally, with the configured model available

The provided Compose file starts Redis only. PostgreSQL and Ollama must be
installed or run separately.

## Local development

### 1. Start Redis

From the repository root:

```bash
docker compose up -d redis
```

### 2. Configure the backend

Install the Python dependencies from the repository root:

```bash
uv sync --group dev
```

Create `backend/.env` (this file is ignored by Git) and configure the values for
your local services:

```dotenv
APP_NAME=Kairox
DEBUG=true
DATABASE_URL=postgresql+psycopg://<user>:<password>@localhost:5432/kairox
SECRET_KEY=<generate-a-long-random-secret>
REDIS_URL=redis://localhost:6379/0
MODEL=qwen3:8b
API_URL=http://localhost:11434/api/chat
```

Replace the placeholders before running the application. Create the PostgreSQL
database, ensure PostgreSQL is accepting connections, then install and start
Ollama and pull the model configured in `MODEL` (for example, `ollama pull
qwen3:8b`).

Run database migrations from `backend/`:

```bash
cd backend
uv run --project .. alembic upgrade head
```

### 3. Start the API and Celery worker

Run each command in its own terminal, with the current directory set to
`backend/`:

```bash
uv run --project .. uvicorn app.main:app --reload
```

```bash
uv run --project .. celery -A app.workers.celery_app:celery_app worker --loglevel=INFO
```

The API is available at `http://localhost:8000`; interactive API documentation
is at `http://localhost:8000/docs`. The worker must be running for submitted
thoughts to be processed. See the [Celery technical guide](docs/celery-guide.md)
for worker commands, monitoring, and troubleshooting.

### 4. Start the frontend

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Vite prints the local frontend URL. By default, the frontend calls
`http://localhost:8000/api/v1`. To use another API origin, set
`VITE_API_BASE_URL` in the frontend environment, including the `/api/v1` prefix.

## Tests and checks

From the repository root:

```bash
uv run --group dev pytest
uv run --group dev ruff check backend
```

From `frontend/`:

```bash
npm run lint
npm run build
```

The frontend lint command checks the whole frontend and may report issues outside
the files changed by a particular task. The build command verifies the
production bundle.

## API areas

The API is mounted at `/api/v1`. Its main route groups cover:

- Authentication (`/auth`)
- Raw inputs (`/inputs`)
- Tasks (`/tasks`)
- Task dependencies (`/task/{task_id}/dependencies`)
- Task reminders (`/task/{task_id}/reminders`)
- Celery job status (`/jobs/{job_id}/status`)

See `/docs` while the API is running for the full request and response schemas.

## Configuration and deployment notes

- Backend settings are loaded from environment variables and `backend/.env`
  when backend commands are run from `backend/`.
- Never commit `.env` files, production credentials, or development tokens.
- Set a unique, securely generated `SECRET_KEY` outside local development.
- Use managed or otherwise persistent PostgreSQL and Redis for deployments.
- Run Alembic migrations as a release step before serving traffic.
- Run at least one Celery worker alongside the API for asynchronous input
  processing.
- Set `API_URL` and `MODEL` to the intended production inference service/model.
- Restrict API origins, network access, and debug settings for production.
