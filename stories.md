uvicorn main:app --reload# Kairox — Project Story Breakdown

> **Project**: AI Workflow Automation Assistant  
> **Vision**: Convert unstructured human input into structured, executable workflows  
> **Tech Stack**: FastAPI · PostgreSQL · Redis · Celery · OpenAI API · React

---

## Overview

This document breaks the entire Kairox project into **4 iterations** containing **24 stories**. The iterations follow a deliberate build order:

| Iteration | Theme | Stories |
|-----------|-------|---------|
| **1 — Foundation** | Data models, project scaffolding, core API, basic UI shell | 1–7 |
| **2 — Intelligence** | AI integration, task extraction, dependency engine, queue system | 8–13 |
| **3 — Automation** | Reminders, drafts, background workers, real-time updates | 14–19 |
| **4 — Polish & Scale** | Timeline/graph views, error handling, caching, testing, deployment | 20–24 |
| **5 — Advanced Features** | Voice input, external integrations, settings, payment | 25–29 |

> **Each story is designed to be independently deliverable and testable. Stories within an iteration can sometimes be parallelized, but cross-iteration dependencies should be respected.**

---

## Iteration 1 — Foundation

> **Goal**: Establish the project skeleton, data models, core CRUD APIs, and a minimal frontend shell. By the end of this iteration you should be able to create a user, submit raw text input, and see it stored in the database.

| # | Story | Backend | Frontend | Database | Redis/Celery |
|---|-------|---------|----------|----------|--------------|
| 1 | Project Scaffolding & Dev Environment | ✅ | ✅ | ✅ | ❌ |
| 2 | User Data Model & Authentication | ✅ | ✅ | ✅ | ❌ |
| 3 | Raw Input Data Model & Submission API | ✅ | ✅ | ✅ | ❌ |
| 4 | Task Data Model & CRUD API | ✅ | ✅ | ✅ | ❌ |
| 5 | Dependency Data Model & API | ✅ | ✅ | ✅ | ❌ |
| 6 | Reminder Data Model & API | ✅ | ✅ | ✅ | ❌ |
| 7 | Draft Data Model & API | ✅ | ✅ | ✅ | ❌ |

📁 **Detailed Stories**: [stories/iteration-1/](stories/iteration-1/)

---

## Iteration 2 — Intelligence

> **Goal**: Integrate AI processing, build the task extraction pipeline, wire up Redis + Celery for async processing, and implement the dependency resolution engine. By the end of this iteration, a user submits text and gets back structured tasks with dependencies.

| # | Story | Backend | Frontend | Database | Redis/Celery |
|---|-------|---------|----------|----------|--------------|
| 8 | Redis Setup & Configuration | ✅ | ❌ | ❌ | ✅ |
| 9 | Celery Worker Setup & Job Infrastructure | ✅ | ✅ | ⚪ | ✅ |
| 10 | AI Integration — OpenAI Service Layer | ✅ | ❌ | ❌ | ❌ |
| 11 | **Input Processing Pipeline (Core Flow)** | ✅ | ✅ | ✅ | ✅ |
| 12 | Time Reference Resolution Engine | ✅ | ✅ | ✅ | ❌ |
| 13 | Dependency Resolution Engine | ✅ | ✅ | ❌ | ❌ |

📁 **Detailed Stories**: [stories/iteration-2/](stories/iteration-2/)

---

## Iteration 3 — Automation

> **Goal**: Build the automation layer including reminder execution, draft generation pipeline, background scheduling, and real-time status updates. By the end, the system actively schedules and fires reminders, generates polished drafts, and keeps the user informed in real time.

| # | Story | Backend | Frontend | Database | Redis/Celery |
|---|-------|---------|----------|----------|--------------|
| 14 | Reminder Execution Worker | ✅ | ✅ | ✅ | ✅ |
| 15 | AI Draft Generation Pipeline | ✅ | ✅ | ✅ | ✅ |
| 16 | Redis Caching Layer | ✅ | ❌ | ❌ | ✅ |
| 17 | Real-Time Updates via WebSocket | ✅ | ✅ | ❌ | ✅ |
| 18 | Input Processing Status Tracking | ✅ | ✅ | ❌ | ✅ |
| 19 | Error Handling & Retry System | ✅ | ✅ | ✅ | ✅ |

📁 **Detailed Stories**: [stories/iteration-3/](stories/iteration-3/)

---

## Iteration 4 — Polish & Scale

> **Goal**: Build premium UI views (timeline, structure, graph), optimize performance, add comprehensive testing, and prepare for deployment. By the end, the app is production-ready and visually stunning.

| # | Story | Backend | Frontend | Database | Redis/Celery |
|---|-------|---------|----------|----------|--------------|
| 20 | Timeline View (Primary UI) | ✅ | ✅ | ❌ | ✅ |
| 21 | Structure View (Tree/Hierarchy) | ✅ | ✅ | ❌ | ❌ |
| 22 | Dashboard & Analytics | ✅ | ✅ | ✅ | ✅ |
| 23 | Comprehensive Testing Suite | ✅ | ✅ | ✅ | ✅ |
| 24 | Production Readiness & Deployment | ✅ | ✅ | ✅ | ✅ |

📁 **Detailed Stories**: [stories/iteration-4/](stories/iteration-4/)

---

## Iteration 5 — Advanced Features

> **Goal**: Take the core MVP of Kairox and add the advanced features needed to turn it into a premium, commercial-ready SaaS application.

| # | Story | Backend | Frontend | Database | Redis/Celery |
|---|-------|---------|----------|----------|--------------|
| 25 | Password Reset & User Settings | ✅ | ✅ | ✅ | ❌ |
| 26 | Voice Input Integration (Whisper) | ✅ | ✅ | ❌ | ✅ |
| 27 | External Integrations (Calendar & Email) | ✅ | ✅ | ✅ | ✅ |
| 28 | Global Search & Command Palette | ✅ | ✅ | ❌ | ❌ |
| 29 | Admin Panel & Billing (Stripe) | ✅ | ✅ | ✅ | ✅ |

📁 **Detailed Stories**: [stories/iteration-5-advanced.md](stories/iteration-5-advanced.md)

---

## Story Dependency Map

```
Story 1 (Scaffolding)
├──→ Story 2 (Auth)
├──→ Story 3 (Raw Input)
├──→ Story 4 (Task CRUD)
│    ├──→ Story 5 (Dependencies)
│    ├──→ Story 6 (Reminders)
│    └──→ Story 7 (Drafts)
├──→ Story 8 (Redis Setup)
│    ├──→ Story 9 (Celery Setup)
│    │    ├──→ Story 10 (AI Service)
│    │    │    └──→ Story 11 (Processing Pipeline) ★ KEYSTONE
│    │    │         ├──→ Story 12 (Time Resolver)
│    │    │         ├──→ Story 13 (Dependency Engine)
│    │    │         ├──→ Story 18 (Progress Tracking)
│    │    │         └──→ Story 19 (Error Handling)
│    │    └──→ Story 14 (Reminder Worker)
│    ├──→ Story 16 (Redis Caching)
│    └──→ Story 17 (WebSocket)
├──→ Story 15 (Draft Pipeline)
├──→ Story 20 (Timeline View)
├──→ Story 21 (Structure View)
├──→ Story 22 (Dashboard)
├──→ Story 23 (Testing Suite)
├──→ Story 24 (Production Deployment)
└──→ Iteration 5 (Advanced SaaS Features)
```

---

## Recommended Execution Notes

- **Parallel tracks**: Within each iteration, backend and frontend stories can often be worked on in parallel. Stories 4–7 in Iteration 1 are mostly independent and can be parallelized.
- **Story 11 is the keystone** — it connects everything from Iteration 1 (models) and Iteration 2 (AI, Redis, Celery) into the core processing pipeline. Give it extra attention and testing.
- **Don't skip Iteration 1** — it's tempting to jump to AI integration, but without solid data models and CRUD APIs, the pipeline will be built on shaky ground.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Work required |
| ⚪ | Optional work |
| ❌ | No work needed |
| ★ | Critical / Keystone story |
