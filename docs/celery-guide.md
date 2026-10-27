# Celery and Redis operations guide

This guide describes how Celery is currently configured and used in Kairox,
including local setup, worker operation, task execution, and common diagnostics.
It documents the implementation in `backend/app/workers/`; it does not assume
features that are not wired into the project.

## What Celery does in Kairox

When an authenticated user submits a raw input:

1. The API stores a `RawInput` record with a pending status.
2. The API queues `process_input` in Celery, passing the raw input ID and user
   ID.
3. Redis holds the queued message until a worker accepts it.
4. The worker loads the input and calls the configured Ollama-compatible chat
   API.
5. The worker creates tasks and dependency records in PostgreSQL.
6. The worker marks the input completed or failed.
7. The frontend polls the input result route and displays the generated tasks.

Redis is configured as both Celery's message broker and result backend. Kairox
also uses Redis for its API cache. The Celery guide concerns the queue and task
results; the Redis cache client is initialized separately by the API.

## Current implementation

| Area | Current behavior |
|---|---|
| Celery application | `backend/app/workers/celery_app.py` |
| Broker and result backend | `REDIS_URL` |
| Main task | `process_input` in `backend/app/workers/tasks/process_input.py` |
| Submission | `process_rawInput.delay(input_id, user_id)` in the raw-input route |
| Worker DB session | Created lazily by `CeleryTaskBase.db` and closed in `after_return` |
| Acknowledgements | Late acknowledgements enabled |
| Prefetch | One task per worker process |
| Result retention | One hour |
| Input progress | Persisted in PostgreSQL as pending, processing, completed, or failed |

The generic Celery task result and the raw-input processing status are distinct:
the API's `/inputs/{input_id}/result` route reads the persisted input and tasks.
The `/jobs/{job_id}/status` route reads Celery's task state/result.

The `process_input` task records a failed input and re-raises the error, but it
does not currently request an automatic retry. Celery retries happen only when
a task calls `self.retry()` (as the development-only `test_failing_task` does).
Global retry-related settings do not make every task retry automatically.

Reminders have API and persistence support, but this repository does not
currently configure a Celery Beat schedule or a reminder-delivery task. Do not
rely on Celery to send reminder notifications until that behavior is implemented.

## Local setup

### Requirements

- Python 3.14 or newer and uv
- Redis 7 or a compatible Redis server
- PostgreSQL
- Ollama running with the model named in `MODEL`

The repository's `docker-compose.yml` starts Redis. PostgreSQL and Ollama must
be started separately. Follow the main [README](../README.md) for installing
Python dependencies, configuring `backend/.env`, creating the database, and
running migrations.

Start Redis from the repository root:

```bash
docker compose up -d redis
docker compose exec redis redis-cli ping
```

Redis should respond with `PONG`.

### Run the API and worker

Open two terminals. Run both backend commands from the `backend/` directory so
the application package and `.env` file resolve consistently.

API:

```bash
uv run --project .. uvicorn app.main:app --reload
```

Celery worker:

```bash
uv run --project .. celery -A app.workers.celery_app:celery_app worker --loglevel=INFO
```

Keep the worker running while submitting thoughts. The API can accept requests
without a worker, but queued inputs will remain pending until a worker consumes
them.

### Verify the worker

From `backend/`, check that Celery can reach the broker and that a worker is
responding:

```bash
uv run --project .. celery -A app.workers.celery_app:celery_app inspect ping
```

Run the small registered smoke-test task and wait for its result:

```bash
uv run --project .. python -c "from app.workers.tasks.test_task import test_task; result = test_task.delay('worker check'); print(result.get(timeout=15))"
```

The command should print a result containing `"status": "ok"`. If the worker is
not available, the result wait will time out; the task may still be queued.

## Configuration

`backend/app/workers/celery_app.py` configures the app from `REDIS_URL`:

- `broker_url` and `result_backend` both use the same Redis URL.
- JSON is the only accepted task/result serialization format.
- UTC is enabled.
- Worker prefetch is set to one and late acknowledgements are enabled.
- Stored task results expire after 3,600 seconds.
- The default retry delay and max-retry values are set in Celery config.

The API and worker need matching values for these environment settings:

```dotenv
REDIS_URL=redis://localhost:6379/0
DATABASE_URL=postgresql+psycopg://<user>:<password>@localhost:5432/kairox
MODEL=qwen3:8b
API_URL=http://localhost:11434/api/chat
```

Use the real local service values in `backend/.env`. Do not commit credentials
or production connection strings.

## Task development

Define background work as a Celery task in `backend/app/workers/tasks/`, using
`CeleryTaskBase` when database-session lifecycle support is needed. The current
worker imports the test and raw-input task modules through its Celery app
configuration.

For a new task:

1. Define it with the project's `celery_app`.
2. Pass serializable values (for example UUID strings), not ORM objects or open
   database sessions.
3. Add the module to task discovery/imports if it is not discovered
   automatically.
4. Decide explicitly whether and when it is safe to retry. Tasks that may run
   more than once should be idempotent.
5. Add tests for success, failure, and retry behavior as appropriate.

For database work, use the task base's `self.db` session and ensure changes are
committed or rolled back by the task's service logic. Do not retain a session
outside task execution.

## Monitoring and troubleshooting

### Worker sees no tasks

- Confirm Redis is running and `REDIS_URL` is the same in the API and worker
  environments.
- Run `celery ... inspect ping` from `backend/`.
- Check the worker startup output for registered task names and import errors.
- Keep the Celery `-A` argument exactly as shown in the run command.

### Input stays pending or processing

- Confirm the worker is running and connected to Redis.
- Check worker logs for errors connecting to PostgreSQL or Ollama.
- Confirm `DATABASE_URL`, `API_URL`, and `MODEL` are correct from the worker's
  environment.
- Query `/inputs/{input_id}/result` to inspect persisted input status and result.
- Use `/jobs/{job_id}/status` when you have the Celery job ID and need its
  generic Celery state/result.

### Worker cannot reach Ollama

- Confirm Ollama is running and listening at `API_URL`.
- Confirm the configured model is installed (for example `ollama pull qwen3:8b`
  when using the default model).
- If the worker is in a container, `localhost` refers to that container, not
  the host machine. Configure a host-reachable Ollama URL for that deployment.

### A task failed

The `process_input` task marks its raw input failed and re-raises the exception.
Check the worker logs for the underlying cause and the persisted error returned
by the input-result route. Fix the cause before submitting the input again.
`process_input` has no automatic retry policy at present.

## Production operation

- Run the API and at least one Celery worker as separate supervised services.
- Use persistent, authenticated Redis and PostgreSQL services with network access
  restricted to the application.
- Keep the broker/result-backend URLs and database credentials in the deployment
  secret store.
- Use durable infrastructure and monitor worker health, queue depth, task
  failures, and database/LLM connectivity.
- Plan for late-acknowledged tasks to be delivered again after worker failure;
  task side effects should be safe to repeat.
- Set up explicit retry policies, timeouts, alerting, and task idempotency before
  relying on automatic recovery in production.
- Do not use the test tasks or test job route as a production health check.
