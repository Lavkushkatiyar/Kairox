# Story 24: Production Readiness & Deployment

| Field | Details |
|-------|---------|
| **Iteration** | 4 — Polish & Scale |
| **Story #** | 24 of 24 |
| **Priority** | 🔴 Critical |
| **Depends On** | All previous stories |
| **Estimated Effort** | 2 days |

---

## User Story

**As a** system owner,  
**I want** to prepare the application for production deployment,  
**So that** Kairox can be securely hosted and used by real users.

---

## Description

The final step. Containerizing the application, securing the APIs, optimizing the frontend, and providing the deployment configuration.

---

## Backend Tasks

### 24.1 — Dockerfile (Backend & Celery)

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Start script depends on CMD or entrypoint
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 24.2 — CORS Configuration

Explicitly configure CORS in `main.py` for the production frontend domain:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://kairox.example.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 24.3 — Rate Limiting

Install `slowapi`. Add rate limiting to auth and input submission endpoints to prevent abuse.
- `POST /inputs`: 10 per minute
- `POST /auth/login`: 5 per minute

### 24.4 — Production `docker-compose.yml`

```yaml
version: '3.8'
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    env_file: .env.production
    depends_on: [db, redis]
    
  worker:
    build: ./backend
    command: celery -A app.workers.celery_app worker --loglevel=info
    env_file: .env.production
    depends_on: [db, redis]
    
  beat:
    build: ./backend
    command: celery -A app.workers.celery_app beat --loglevel=info
    env_file: .env.production
    depends_on: [redis]

  db:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]
    env_file: .env.production
    
  redis:
    image: redis:7-alpine
    volumes: [redisdata:/data]
```

---

## Frontend Tasks

### 24.5 — Dockerfile (Frontend)

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 24.6 — Nginx Config (SPA Routing)

Ensure Nginx is configured to serve `index.html` for all routes (to support React Router).

### 24.7 — Environment Variables

Create `.env.production` for Vite pointing to the production API URL.

---

## Acceptance Criteria

- [ ] Both Backend and Frontend Dockerfiles build successfully
- [ ] `docker-compose up` brings up the entire stack without errors
- [ ] CORS is strictly configured for production
- [ ] Rate limiting is applied to sensitive endpoints
- [ ] Frontend routing works via Nginx in production build
- [ ] Database data persists across container restarts (Volumes)
