
#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
WORKER_IMAGE="kairox-worker"

# -------------------------
# Helpers
# -------------------------

log() {
    printf '\n[INFO] %s\n' "$1"
}

error() {
    printf '\n[ERROR] %s\n' "$1" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || error "$1 is not installed."
}

require_directory() {
    [[ -d "$1" ]] || error "Directory not found: $1"
}

# -------------------------
# Development commands
# -------------------------

setup() {
    log "Installing backend dependencies..."
    require_command uv
    (cd "$ROOT_DIR" && uv sync --group dev)

    if [[ -f "$FRONTEND_DIR/package.json" ]]; then
        log "Installing frontend dependencies..."
        require_command npm
        (cd "$FRONTEND_DIR" && npm ci)
    fi

    log "Setup completed."
}

up() {
    require_command docker
    log "Starting local infrastructure..."
    docker compose -f "$COMPOSE_FILE" up -d
}

down() {
    require_command docker
    log "Stopping local infrastructure..."
    docker compose -f "$COMPOSE_FILE" down
}

status() {
    require_command docker
    docker compose -f "$COMPOSE_FILE" ps
}

logs() {
    require_command docker
    docker compose -f "$COMPOSE_FILE" logs -f
}

api() {
    require_command uv
    require_directory "$BACKEND_DIR"

    log "Starting FastAPI..."
    (
        cd "$BACKEND_DIR"
        uv run --project .. uvicorn app.main:app --reload
    )
}

worker() {
    require_command uv
    require_directory "$BACKEND_DIR"

    log "Starting Celery worker..."
    (
        cd "$BACKEND_DIR"
        uv run --project .. celery \
            -A app.workers.celery_app:celery_app \
            worker --loglevel=INFO
    )
}

frontend() {
    require_command npm
    require_directory "$FRONTEND_DIR"

    log "Starting React frontend..."
    (
        cd "$FRONTEND_DIR"
        npm run dev
    )
}

# -------------------------
# Database commands
# -------------------------

migrate() {
    require_command uv

    log "Applying database migrations..."
    (
        cd "$BACKEND_DIR"
        uv run --project .. alembic upgrade head
    )
}

migration() {
    require_command uv

    local message="${1:-}"

    [[ -n "$message" ]] || error "Usage: ./dev.sh migration \"migration message\""

    (
        cd "$BACKEND_DIR"
        uv run --project .. alembic revision --autogenerate -m "$message"
    )
}

# -------------------------
# Quality checks
# -------------------------

test() {
    require_command uv
    log "Running backend tests..."
    (cd "$ROOT_DIR" && uv run --group dev pytest)
}

lint() {
    require_command uv
    log "Running Ruff..."
    (cd "$ROOT_DIR" && uv run --group dev ruff check backend)
}

build_frontend() {
    require_command npm
    require_directory "$FRONTEND_DIR"

    log "Building frontend..."
    (cd "$FRONTEND_DIR" && npm run build)
}

# -------------------------
# Docker commands
# -------------------------

docker_build() {
    require_command docker

    [[ -f "$ROOT_DIR/Dockerfile" ]] || error "Dockerfile does not exist yet."

    log "Building Kairox worker image..."
    docker build -t "$WORKER_IMAGE" "$ROOT_DIR"
}

docker_worker() {
    require_command docker

    [[ -f "$ROOT_DIR/Dockerfile" ]] || error "Dockerfile does not exist yet."
    [[ -f "$BACKEND_DIR/.env" ]] || error "backend/.env not found."

    log "Starting Celery worker container..."
    docker run --rm \
        --name kairox-worker \
        --env-file "$BACKEND_DIR/.env" \
        "$WORKER_IMAGE"
}

start_all() {
    require_command uv
    require_command docker
    require_command npm

    log "Starting Kairox infrastructure..."
    docker compose -f "$COMPOSE_FILE" up -d

    local -a pids=()

    cleanup() {
        log "Stopping Kairox development processes..."

        for pid in "${pids[@]}"; do
            kill "$pid" 2>/dev/null || true
        done

        wait 2>/dev/null || true
        log "Kairox development processes stopped."
    }

    trap cleanup EXIT INT TERM

    log "Starting FastAPI..."
    (cd "$BACKEND_DIR" && uv run --project .. uvicorn app.main:app --reload) &
    pids+=("$!")

    log "Starting Celery worker..."
    (cd "$BACKEND_DIR" && uv run --project .. celery \
        -A app.workers.celery_app:celery_app worker --loglevel=INFO) &
    pids+=("$!")

    log "Starting React frontend..."
    (cd "$FRONTEND_DIR" && npm run dev) &
    pids+=("$!")

    log "Kairox development environment started."
    log "API:      http://localhost:8000"
    log "API Docs: http://localhost:8000/docs"
    log "Frontend: Vite development URL"

    wait
}


# -------------------------
# CLI
# -------------------------

usage() {
    cat <<'EOF'
Kairox Development CLI

Usage:
  ./dev.sh <command>

Development:
  setup              Install backend and frontend dependencies
  up                 Start local Docker infrastructure
  down               Stop local Docker infrastructure
  status             Show infrastructure status
  logs               Follow infrastructure logs
  api                Start FastAPI
  worker             Start Celery worker
  frontend           Start React frontend

Database:
  migrate            Apply Alembic migrations
  migration "name"   Generate a migration

Quality:
  test               Run backend tests
  lint               Run Ruff
  build:frontend     Build React frontend

Docker:
  docker:build       Build Celery worker image
  docker:worker      Run Celery inside Docker

Other:
  help               Show this help
EOF
}

main() {
    local command="${1:-help}"

    case "$command" in
        setup) setup ;;
        up) up ;;
        down) down ;;
        status) status ;;
        logs) logs ;;
        api) api ;;
        worker) worker ;;
        frontend) frontend ;;
        migrate) migrate ;;
        migration) migration "${2:-}" ;;
        test) test ;;
        lint) lint ;;
        build:frontend) build_frontend ;;
        docker:build) docker_build ;;
        docker:worker) docker_worker ;;
        help|-h|--help) usage ;;
        start_all) start_all ;;
        *) error "Unknown command: $command. Run ./dev.sh help." ;;
    esac
}





main "$@"
