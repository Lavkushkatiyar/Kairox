# Kairox

# AI Workflow Automation Assistant

---

## 1. Story

Modern work is not structured.

People do not think in clean lists or organized systems.

They think in fragments, interruptions, and mixed intentions.

A single thought can contain multiple actions, deadlines, and dependencies.

For example:

“Finish the report, send it before the meeting tomorrow at 11, check logs tonight, and inform the manager.”

This is natural thinking.

But execution systems expect structure.

That mismatch creates friction.

Users are forced to:
- break thoughts manually
- assign priorities
- set reminders
- track dependencies

Most people skip these steps.

As a result:
- tasks get delayed
- priorities get confused
- execution becomes inconsistent

This project solves that exact gap.

The system allows users to think naturally.

The system takes responsibility for structuring execution.

---

## 2. Vision

The vision of this project is simple:

> Convert unstructured human input into structured, executable workflows.

The system acts as an interpreter between thought and action.

It does not replace thinking.

It organizes thinking.

It does not act as a chatbot.

It acts as a workflow engine powered by interpretation.

The system focuses on:
- clarity
- automation
- execution flow
- minimal user effort

---

## 3. Product Definition

The product is an AI-powered backend system that:

- accepts natural language input
- extracts structured tasks
- detects time references
- identifies dependencies
- schedules reminders
- generates drafts when needed
- presents everything in a timeline + structured view

It is not just a task manager.

It is a system that builds execution logic from human input.

---

## 4. Core Example

### User Input

“Tomorrow I have a meeting at 11, finish the report before that, send it to Aman, check logs tonight, and draft a message to my manager.”

---

### System Output

Tasks:
- Check logs (Tonight)
- Finish report (Tomorrow morning)
- Send report to Aman (Before 11 AM)
- Meeting at 11 AM

Dependency Flow:
Finish report → Send report → Meeting

Draft:
“Hi, the report will be ready by tomorrow morning.”

---

### Result

User does not structure anything manually.

User reviews and executes.

---

## 5. Why This Matters

The system reduces:
- cognitive load
- planning effort
- task fragmentation

The system improves:
- clarity
- execution order
- time awareness

This creates a workflow where:
thinking → input → structured execution

---

## 6. System Architecture Overview

This is a backend-heavy system.

The frontend is primarily for visualization.

The backend handles:
- interpretation
- processing
- automation
- scheduling
- storage

---

## 7. Tech Stack

### Backend Core
- Python

### API Layer
- FastAPI

Reason:
- async support
- fast development
- clean request/response handling
- strong validation capabilities

---

### Database
- PostgreSQL

Reason:
- relational structure
- strong consistency
- supports dependencies and relations
- reliable for structured data

---

### Cache + Queue
- Redis

Reason:
- fast in-memory store
- supports queues
- supports pub/sub
- ideal for background processing

---

### Background Workers
- Celery (or RQ)

Reason:
- asynchronous task execution
- job scheduling
- retry mechanisms
- separation of concerns

---

### AI Layer
- OpenAI API (or equivalent)

Role:
- interpret input
- extract tasks
- generate drafts
- detect structure

---

### Frontend
- React (MERN compatibility)

Role:
- timeline visualization
- task structure display
- interaction layer

---

## 8. Backend Architecture Breakdown

### 1. API Layer (FastAPI)

Responsibilities:
- receive user input
- validate request
- trigger processing
- return response

Endpoints:
- create input
- fetch tasks
- fetch timeline
- update task

---

### 2. Processing Layer

Responsibilities:
- send input to AI
- receive structured output
- normalize data
- validate structure

This layer ensures:
AI output → usable backend data

---

### 3. Task Management Layer

Responsibilities:
- create tasks
- store tasks
- manage status
- manage dependencies

This is the core business logic layer.

---

### 4. Automation Layer

Responsibilities:
- create reminders
- schedule events
- trigger background jobs

This layer turns data into action.

---

### 5. Queue Layer (Redis)

Responsibilities:
- hold pending jobs
- manage task execution order
- enable async processing

Flow:
API → Queue → Worker

---

### 6. Worker Layer (Celery)

Responsibilities:
- process jobs
- handle AI calls
- schedule reminders
- retry failed tasks

Workers run independently from API.

---

### 7. Storage Layer (PostgreSQL)

Stores:
- raw input
- structured tasks
- dependencies
- reminders
- drafts
- job status

---

## 9. Data Flow

### Step 1
User sends text input.

---

### Step 2
API receives request.

---

### Step 3
Input stored as raw data.

---

### Step 4
Job pushed to Redis queue.

---

### Step 5
Worker picks job.

---

### Step 6
AI processes input.

---

### Step 7
Structured data returned.

---

### Step 8
Backend validates and normalizes.

---

### Step 9
Tasks stored in PostgreSQL.

---

### Step 10
Reminders scheduled.

---

### Step 11
Frontend fetches structured data.

---

### Step 12
User sees timeline and structure.

---

## 10. Redis Role (Important)

Redis is not just cache.

It is the backbone of async execution.

Redis handles:
- job queues
- worker communication
- temporary state
- retry handling

Without Redis:
- system becomes synchronous
- performance degrades
- scalability reduces

---

## 11. Background Processing Flow

Some operations should not block API:

- AI interpretation
- reminder scheduling
- draft generation
- dependency calculation

These go through:
API → Redis → Worker → DB

This ensures:
- fast response
- reliable execution
- scalable design

---

## 12. Task Structure Model

Each task includes:
- title
- description
- due time
- priority
- status
- type
- dependency reference

---

## 13. Dependency System

Tasks can depend on other tasks.

Example:
Finish report → Send report → Meeting

This allows:
- execution ordering
- visual flow
- blocking detection

---

## 14. Reminder System

Reminders are generated when:
- time is detected
- deadlines exist

Types:
- pre-event reminder
- deadline reminder

Execution handled via background jobs.

---

## 15. Draft Generation

If input includes communication intent:
- system generates draft

Draft is:
- editable
- not auto-sent

This adds practical value.

---

## 16. Frontend Role

Frontend is not logic-heavy.

Frontend responsibilities:
- display timeline
- display task hierarchy
- show dependencies
- allow edits

---

## 17. Timeline View

Primary UI:

- grouped by date
- expandable days
- ordered tasks
- reminder indicators

---

## 18. Structure View

Secondary UI:

- tree structure
- parent-child tasks
- dependency chains

---

## 19. Graph View (Optional Future)

Advanced UI:

- nodes = tasks
- edges = dependencies

Inspired by tools like Obsidian.

---

## 20. Backend-First Approach

Development order:

1. API design  
2. Data model  
3. Redis integration  
4. Worker setup  
5. AI processing  
6. Task storage  
7. Reminder system  
8. Frontend  

This avoids frontend assumptions.

---

## 21. MVP Scope

Keep initial version minimal:

- text input only
- task extraction
- basic timeline
- simple reminders
- draft generation

---

## 22. System Guarantees

Backend must ensure:
- structured output
- data consistency
- job reliability
- retry handling
- clear state tracking

---

## 23. Non-Goals

Do not include initially:
- full integrations
- complex auth
- real-time sync
- enterprise features

---

## 24. Final Summary

This system transforms:
unstructured thoughts → structured execution

It combines:
- AI interpretation
- backend automation
- structured storage
- visual execution flow

It is a backend-driven product.

It is a practical system.

It is a strong foundation for learning Python deeply.

---

## 25. One-Line Definition

A system that converts messy human input into structured tasks, timelines, and automated actions.


