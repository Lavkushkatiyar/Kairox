# Story 23: Comprehensive Testing Suite

| Field | Details |
|-------|---------|
| **Iteration** | 4 — Polish & Scale |
| **Story #** | 23 of 24 |
| **Priority** | 🔴 Critical |
| **Depends On** | All previous stories |
| **Estimated Effort** | 3 days |

---

## User Story

**As a** developer,  
**I want** a comprehensive suite of unit and integration tests,  
**So that** I can confidently deploy the system and catch regressions when changing code.

---

## Description

Kairox has complex logic (dependency resolution, time parsing, async workers). Tests are non-negotiable before a production release.

---

## Backend Tasks

### 23.1 — Setup Testing Infrastructure

- Install dependencies: `pytest`, `pytest-asyncio`, `pytest-cov`, `httpx`, `fakeredis`
- Create `tests/conftest.py`:
  - Fixture for test database (SQLite for speed, or separate Postgres DB)
  - Fixture for `TestClient` (FastAPI)
  - Fixture for `MockAIService`
  - Fixtures for authenticated users (with JWT tokens)
  - Fixture for `fakeredis` to mock Redis

### 23.2 — Core Service Unit Tests

- `tests/services/test_time_resolver.py`: Test all 15+ time expressions.
- `tests/services/test_dependency_engine.py`: Test cycle detection, topological sort with various graph shapes (linear, tree, unconnected nodes).
- `tests/services/test_ai_service.py`: Test parsing logic assuming a mock response.

### 23.3 — API Integration Tests

- `tests/api/test_auth.py`: Registration, login, invalid credentials, token refresh.
- `tests/api/test_inputs.py`: Submit input, list inputs, validation.
- `tests/api/test_tasks.py`: Full CRUD, filtering, pagination.
- `tests/api/test_dependencies.py`: Add, remove, block circular.

### 23.4 — Pipeline Integration Test (The Big One)

- `tests/workers/test_pipeline.py`:
  - Run `process_input` task synchronously (using `.apply()` instead of `.delay()`).
  - Verify tasks, dependencies, drafts, and reminders are created in the DB as expected.

---

## Frontend Tasks

### 23.5 — Setup Testing Infrastructure

- Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`
- Configure `vitest.config.js`

### 23.6 — Component Tests

- `InputBox.test.jsx`: Check form submission, validation rules.
- `TaskCard.test.jsx`: Verify status toggle, priority colors render correctly.
- `Timeline.test.jsx`: Verify grouped tasks display in the right day sections.

### 23.7 — Store/Service Tests

- Test `useTaskStore` actions.
- Mock `axios` using `msw` (Mock Service Worker) to test data fetching.

---

## Acceptance Criteria

- [ ] Pytest runs all backend tests successfully (`pytest`)
- [ ] Backend test coverage is > 80% (`pytest --cov=app`)
- [ ] Vitest runs frontend component tests successfully
- [ ] Core pipeline test runs end-to-end without mocking the DB
- [ ] Circular dependency logic has specific test cases
