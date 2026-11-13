
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Install PostgreSQL client library
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency definitions
COPY pyproject.toml uv.lock ./

# Install production dependencies
RUN uv sync --frozen --no-dev --no-install-project

# Copy backend source
COPY backend/ ./backend/

WORKDIR /app/backend

CMD ["uv", "run", "--project", "..", "--no-sync", "celery", "-A", "app.workers.celery_app:celery_app", "worker", "--loglevel=INFO"]
