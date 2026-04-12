# Story 3: Raw Input Data Model & Submission API

| Field | Details |
|-------|---------|
| **Iteration** | 1 — Foundation |
| **Story #** | 3 of 24 |
| **Priority** | 🔴 Critical |
| **Depends On** | Story 1 (Scaffolding), Story 2 (Auth) |
| **Blocks** | Story 7 (Drafts), Story 11 (Processing Pipeline) |
| **Estimated Effort** | 1–2 days |

---

## User Story

**As a** user,  
**I want** to submit natural language text to the system,  
**So that** it can later be processed into structured tasks and workflows.

---

## Description

The Raw Input is the **entry point** of the entire Kairox system. Everything begins with a user typing their thoughts in natural language. This story creates:

1. The `RawInput` database model to store submitted text.
2. API endpoints for submitting and retrieving inputs.
3. A frontend input box and submission history.

At this stage, inputs are just **stored** — processing comes in Story 11. The status field tracks where each input is in the pipeline.

---

## Backend Tasks

### 3.1 — Create RawInput Model (`models/raw_input.py`)

```python
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class InputStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class RawInput(Base):
    __tablename__ = "raw_inputs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    status = Column(
        Enum(InputStatus),
        default=InputStatus.PENDING,
        nullable=False
    )
    source = Column(String(50), default="manual")  # manual, voice, email, api
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", backref="inputs")
    tasks = relationship("Task", back_populates="input", lazy="dynamic")
    drafts = relationship("Draft", back_populates="input", lazy="dynamic")
```

**Key decisions:**
- `Text` type for unlimited input length
- `status` as Enum — `pending` → `processing` → `completed`/`failed`
- `source` field for future multi-channel input (voice, email)
- `error_message` for storing failure details
- `processed_at` to track processing time metrics

### 3.2 — Create Pydantic Schemas (`schemas/raw_input.py`)

```python
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.raw_input import InputStatus

# --- Request Schemas ---

class RawInputCreate(BaseModel):
    text: str = Field(
        ..., 
        min_length=1, 
        max_length=5000,
        description="Natural language text input"
    )
    source: str = "manual"

# --- Response Schemas ---

class RawInputRead(BaseModel):
    id: UUID
    user_id: UUID
    text: str
    status: InputStatus
    source: str
    error_message: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class RawInputList(BaseModel):
    items: List[RawInputRead]
    total: int
    page: int
    page_size: int
    has_more: bool

class RawInputSubmitResponse(BaseModel):
    """Response after submitting input (before processing)."""
    input_id: UUID
    status: InputStatus
    message: str = "Input received and queued for processing"
```

### 3.3 — Create Input Service (`services/input_service.py`)

```python
from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID
from app.models.raw_input import RawInput, InputStatus
from app.schemas.raw_input import RawInputCreate, RawInputRead, RawInputList

class InputService:

    @staticmethod
    def create_input(db: Session, user_id: UUID, data: RawInputCreate) -> RawInput:
        """
        Store raw input text.
        In Story 11, this will also dispatch async processing.
        """
        raw_input = RawInput(
            user_id=user_id,
            text=data.text.strip(),
            source=data.source,
            status=InputStatus.PENDING
        )
        db.add(raw_input)
        db.commit()
        db.refresh(raw_input)
        return raw_input

    @staticmethod
    def get_inputs(
        db: Session, 
        user_id: UUID, 
        page: int = 1, 
        page_size: int = 20,
        status_filter: InputStatus = None
    ) -> RawInputList:
        """Get paginated list of user's inputs."""
        query = db.query(RawInput).filter(RawInput.user_id == user_id)
        
        if status_filter:
            query = query.filter(RawInput.status == status_filter)
        
        total = query.count()
        items = (
            query
            .order_by(desc(RawInput.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        
        return RawInputList(
            items=[RawInputRead.from_orm(i) for i in items],
            total=total,
            page=page,
            page_size=page_size,
            has_more=(page * page_size) < total
        )

    @staticmethod
    def get_input(db: Session, user_id: UUID, input_id: UUID) -> RawInput:
        """Get a single input by ID (scoped to user)."""
        raw_input = (
            db.query(RawInput)
            .filter(RawInput.id == input_id, RawInput.user_id == user_id)
            .first()
        )
        if not raw_input:
            raise ValueError("Input not found")
        return raw_input

    @staticmethod
    def update_status(
        db: Session, 
        input_id: UUID, 
        status: InputStatus, 
        error_message: str = None
    ):
        """Update input processing status (used by workers)."""
        raw_input = db.query(RawInput).filter(RawInput.id == input_id).first()
        if raw_input:
            raw_input.status = status
            if error_message:
                raw_input.error_message = error_message
            if status == InputStatus.COMPLETED:
                from datetime import datetime
                raw_input.processed_at = datetime.utcnow()
            db.commit()
```

### 3.4 — Create Input API Endpoints (`api/v1/inputs.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.raw_input import InputStatus
from app.schemas.raw_input import (
    RawInputCreate, 
    RawInputRead, 
    RawInputList,
    RawInputSubmitResponse
)
from app.services.input_service import InputService

router = APIRouter(prefix="/inputs", tags=["Inputs"])

@router.post("/", response_model=RawInputSubmitResponse, status_code=201)
def submit_input(
    data: RawInputCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a natural language text input for processing.
    
    The input is stored and queued for async processing.
    Use GET /inputs/{id} to check processing status.
    """
    raw_input = InputService.create_input(db, current_user.id, data)
    
    # In Story 11: dispatch async processing here
    # process_input.delay(str(raw_input.id))
    
    return RawInputSubmitResponse(
        input_id=raw_input.id,
        status=raw_input.status
    )

@router.get("/", response_model=RawInputList)
def list_inputs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: InputStatus = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all inputs submitted by the current user.
    
    Supports pagination and optional status filter.
    """
    return InputService.get_inputs(
        db, current_user.id, page, page_size, status
    )

@router.get("/{input_id}", response_model=RawInputRead)
def get_input(
    input_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a single input by ID.
    
    Includes current processing status.
    """
    try:
        return InputService.get_input(db, current_user.id, input_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

### 3.5 — Register Router

In `api/v1/router.py`:
```python
from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.inputs import router as input_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(input_router)
```

---

## Frontend Tasks

### 3.6 — Input Service (`services/inputService.js`)

```javascript
import api from './api';

const inputService = {
  submitInput: async (text) => {
    const response = await api.post('/api/v1/inputs', { text });
    return response.data;
  },

  getInputs: async (page = 1, pageSize = 20, status = null) => {
    const params = { page, page_size: pageSize };
    if (status) params.status = status;
    const response = await api.get('/api/v1/inputs', { params });
    return response.data;
  },

  getInput: async (inputId) => {
    const response = await api.get(`/api/v1/inputs/${inputId}`);
    return response.data;
  },
};

export default inputService;
```

### 3.7 — Input Box Component (`components/InputBox.jsx`)

This is the **primary interaction point** of the entire app.

**Design requirements:**
- Large, inviting text area (think: search bar energy, but for thoughts)
- Placeholder text: *"What's on your mind? Type your tasks, meetings, and plans..."*
- Character count indicator (max 5000)
- Submit button with loading state
- Keyboard shortcut: `Ctrl+Enter` to submit
- Subtle expanding animation when focused

**Behavior:**
- [ ] On submit: call `inputService.submitInput(text)`
- [ ] Show success toast with "Processing..." message
- [ ] Clear input after successful submission
- [ ] Disable button while submitting (prevent double-submit)

### 3.8 — Input History Component (`components/InputHistory.jsx`)

**Design requirements:**
- List of past submissions, newest first
- Each item shows:
  - Text preview (truncated to 100 chars)
  - Status badge with color:
    - `pending` → yellow
    - `processing` → blue (animated pulse)
    - `completed` → green
    - `failed` → red
  - Timestamp (relative: "2 minutes ago")
  - Source icon (keyboard for manual)
- Click to expand and see full text
- Pagination or infinite scroll
- Status filter dropdown

### 3.9 — Input Store (`store/inputStore.js`)

```javascript
import { create } from 'zustand';
import inputService from '../services/inputService';

const useInputStore = create((set, get) => ({
  inputs: [],
  total: 0,
  page: 1,
  isLoading: false,
  isSubmitting: false,

  submitInput: async (text) => {
    set({ isSubmitting: true });
    try {
      const result = await inputService.submitInput(text);
      // Refresh input list after submission
      await get().fetchInputs();
      return result;
    } finally {
      set({ isSubmitting: false });
    }
  },

  fetchInputs: async (page = 1) => {
    set({ isLoading: true });
    try {
      const data = await inputService.getInputs(page);
      set({
        inputs: data.items,
        total: data.total,
        page: data.page,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },
}));

export default useInputStore;
```

### 3.10 — Dashboard Page Update

- [ ] Add `InputBox` component at the top of the dashboard
- [ ] Add `InputHistory` component below the input box
- [ ] Fetch input history on page load

---

## Database Tasks

### 3.11 — Generate Migration

```bash
alembic revision --autogenerate -m "create_raw_inputs_table"
alembic upgrade head
```

### 3.12 — Table Structure Verification

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY |
| `user_id` | UUID | FOREIGN KEY → users.id, NOT NULL |
| `text` | TEXT | NOT NULL |
| `status` | ENUM | NOT NULL, DEFAULT 'pending' |
| `source` | VARCHAR(50) | DEFAULT 'manual' |
| `error_message` | TEXT | NULLABLE |
| `created_at` | TIMESTAMP | DEFAULT now() |
| `processed_at` | TIMESTAMP | NULLABLE |

### 3.13 — Indexes

- [ ] Index on `(user_id, created_at DESC)` — for listing inputs by user
- [ ] Index on `(status)` — for worker polling of pending inputs

---

## Acceptance Criteria

- [ ] `POST /api/v1/inputs` stores text and returns `{ input_id, status: "pending" }`
- [ ] Empty text is rejected with 422 validation error
- [ ] Text over 5000 chars is rejected
- [ ] `GET /api/v1/inputs` returns paginated list of user's inputs
- [ ] `GET /api/v1/inputs/{id}` returns single input with status
- [ ] User A cannot see User B's inputs (user scoping)
- [ ] Frontend input box submits text and shows success feedback
- [ ] Input history shows past submissions with status badges
- [ ] Status filter works correctly

---

## Files Created / Modified

| File | Action | Description |
|------|--------|-------------|
| `backend/app/models/raw_input.py` | NEW | RawInput model + status enum |
| `backend/app/schemas/raw_input.py` | NEW | Input request/response schemas |
| `backend/app/services/input_service.py` | NEW | Input business logic |
| `backend/app/api/v1/inputs.py` | NEW | Input API endpoints |
| `backend/app/api/v1/router.py` | MODIFIED | Register input router |
| `frontend/src/services/inputService.js` | NEW | Input API client |
| `frontend/src/components/InputBox.jsx` | NEW | Text input component |
| `frontend/src/components/InputHistory.jsx` | NEW | Input history list |
| `frontend/src/store/inputStore.js` | NEW | Input state management |

---

## Notes

- At this stage, the input is **only stored** — it is not processed.
- Story 11 will add the processing dispatch after `create_input()`.
- The `source` field is `manual` for now but supports future channels.
- Consider adding rate limiting (e.g., 10 inputs per minute per user) in Story 19.
