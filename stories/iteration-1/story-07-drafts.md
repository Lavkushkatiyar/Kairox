# Story 7: Draft Data Model & API

| Field | Details |
|-------|---------|
| **Iteration** | 1 — Foundation |
| **Story #** | 7 of 24 |
| **Priority** | 🟡 High |
| **Depends On** | Story 3 (Raw Input), Story 4 (Task CRUD) |
| **Blocks** | Story 15 (Draft Generation Pipeline) |
| **Estimated Effort** | 1–2 days |

---

## User Story

**As a** user,  
**I want** auto-generated message drafts stored for review,  
**So that** I can quickly edit and send communications without writing from scratch.

---

## Description

When a user says *"draft a message to my manager"* or *"inform Aman about the report"*, the system detects communication intent and generates a draft. This story creates:

1. `Draft` data model with types (email, message, note).
2. CRUD API for draft management.
3. Frontend draft viewer/editor.

**Note:** Actual AI draft generation comes in Story 15. This builds the storage and management layer.

---

## Backend Tasks

### 7.1 — Create Draft Model (`models/draft.py`)

```python
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class DraftType(str, enum.Enum):
    EMAIL = "email"
    MESSAGE = "message"
    NOTE = "note"

class DraftStatus(str, enum.Enum):
    GENERATED = "generated"     # Created by AI, not yet reviewed
    EDITED = "edited"           # User modified the draft
    SENT = "sent"               # User marked as sent
    DISCARDED = "discarded"     # User dismissed it

class DraftTone(str, enum.Enum):
    FORMAL = "formal"
    CASUAL = "casual"
    BRIEF = "brief"

class Draft(Base):
    __tablename__ = "drafts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("tasks.id", ondelete="SET NULL"), 
        nullable=True  # Draft can exist after task is deleted
    )
    input_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("raw_inputs.id"), 
        nullable=False
    )
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id"), 
        nullable=False
    )
    
    # Content
    content = Column(Text, nullable=False)
    draft_type = Column(Enum(DraftType), default=DraftType.MESSAGE, nullable=False)
    tone = Column(Enum(DraftTone), default=DraftTone.FORMAL, nullable=False)
    
    # Recipient info
    recipient = Column(String(255), nullable=True)  # Name or email
    subject = Column(String(255), nullable=True)     # For email drafts
    
    # Status
    status = Column(Enum(DraftStatus), default=DraftStatus.GENERATED, nullable=False)
    
    # Version tracking
    original_content = Column(Text, nullable=True)   # AI-generated content (preserved)
    version = Column(Integer, default=1)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    task = relationship("Task", back_populates="drafts")
    input = relationship("RawInput", back_populates="drafts")
    user = relationship("User", backref="drafts")
```

**Key design decisions:**
- `task_id` uses `SET NULL` on delete — drafts survive task deletion
- `original_content` preserves the AI version even after user edits
- `tone` tracks the style used for generation (for regeneration)
- `version` increments on each AI regeneration
- `subject` field supports email-type drafts

### 7.2 — Create Pydantic Schemas (`schemas/draft.py`)

```python
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.draft import DraftType, DraftStatus, DraftTone

# --- Request Schemas ---

class DraftCreate(BaseModel):
    content: str = Field(..., min_length=1)
    draft_type: DraftType = DraftType.MESSAGE
    tone: DraftTone = DraftTone.FORMAL
    recipient: Optional[str] = None
    subject: Optional[str] = None
    task_id: Optional[UUID] = None
    input_id: UUID

class DraftUpdate(BaseModel):
    content: Optional[str] = None
    draft_type: Optional[DraftType] = None
    recipient: Optional[str] = None
    subject: Optional[str] = None
    status: Optional[DraftStatus] = None

class DraftRegenerate(BaseModel):
    tone: DraftTone = DraftTone.FORMAL
    additional_context: Optional[str] = None  # e.g., "make it more apologetic"

# --- Response Schemas ---

class DraftRead(BaseModel):
    id: UUID
    task_id: Optional[UUID]
    input_id: UUID
    user_id: UUID
    content: str
    draft_type: DraftType
    tone: DraftTone
    recipient: Optional[str]
    subject: Optional[str]
    status: DraftStatus
    original_content: Optional[str]
    version: int
    created_at: datetime
    updated_at: datetime
    
    # Enriched
    task_title: Optional[str] = None

    class Config:
        from_attributes = True

class DraftList(BaseModel):
    items: List[DraftRead]
    total: int
```

### 7.3 — Create Draft Service (`services/draft_service.py`)

```python
from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID
from app.models.draft import Draft, DraftStatus
from app.models.task import Task
from app.schemas.draft import DraftCreate, DraftUpdate

class DraftService:

    @staticmethod
    def create_draft(db: Session, user_id: UUID, data: DraftCreate) -> Draft:
        """Create a draft (typically from AI processing)."""
        draft = Draft(
            user_id=user_id,
            input_id=data.input_id,
            task_id=data.task_id,
            content=data.content,
            original_content=data.content,  # Preserve original
            draft_type=data.draft_type,
            tone=data.tone,
            recipient=data.recipient,
            subject=data.subject,
            status=DraftStatus.GENERATED
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)
        return draft

    @staticmethod
    def get_drafts(
        db: Session,
        user_id: UUID,
        status_filter: DraftStatus = None,
        task_id: UUID = None
    ) -> dict:
        """Get user's drafts with optional filters."""
        query = db.query(Draft).filter(Draft.user_id == user_id)
        
        if status_filter:
            query = query.filter(Draft.status == status_filter)
        if task_id:
            query = query.filter(Draft.task_id == task_id)
        
        items = query.order_by(desc(Draft.created_at)).all()
        
        # Enrich with task titles
        for item in items:
            if item.task_id:
                task = db.query(Task).filter(Task.id == item.task_id).first()
                if task:
                    item.task_title = task.title
        
        return {"items": items, "total": len(items)}

    @staticmethod
    def get_draft(db: Session, user_id: UUID, draft_id: UUID) -> Draft:
        """Get a single draft by ID."""
        draft = db.query(Draft).filter(
            Draft.id == draft_id, Draft.user_id == user_id
        ).first()
        if not draft:
            raise ValueError("Draft not found")
        return draft

    @staticmethod
    def update_draft(
        db: Session,
        user_id: UUID,
        draft_id: UUID,
        data: DraftUpdate
    ) -> Draft:
        """Update a draft's content or status."""
        draft = DraftService.get_draft(db, user_id, draft_id)
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(draft, field, value)
        
        # If content was changed, mark as edited
        if data.content and data.content != draft.original_content:
            draft.status = DraftStatus.EDITED
        
        db.commit()
        db.refresh(draft)
        return draft

    @staticmethod
    def mark_sent(db: Session, user_id: UUID, draft_id: UUID):
        """Mark a draft as sent."""
        draft = DraftService.get_draft(db, user_id, draft_id)
        draft.status = DraftStatus.SENT
        db.commit()

    @staticmethod
    def discard_draft(db: Session, user_id: UUID, draft_id: UUID):
        """Discard a draft."""
        draft = DraftService.get_draft(db, user_id, draft_id)
        draft.status = DraftStatus.DISCARDED
        db.commit()
```

### 7.4 — Create Draft API Endpoints (`api/v1/drafts.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.draft import DraftStatus
from app.schemas.draft import DraftCreate, DraftRead, DraftUpdate, DraftList
from app.services.draft_service import DraftService

router = APIRouter(prefix="/drafts", tags=["Drafts"])

@router.post("/", response_model=DraftRead, status_code=201)
def create_draft(
    data: DraftCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new draft."""
    return DraftService.create_draft(db, current_user.id, data)

@router.get("/", response_model=DraftList)
def list_drafts(
    status: DraftStatus = None,
    task_id: UUID = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List drafts with optional status and task filters."""
    return DraftService.get_drafts(
        db, current_user.id, status, task_id
    )

@router.get("/{draft_id}", response_model=DraftRead)
def get_draft(
    draft_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single draft by ID."""
    try:
        return DraftService.get_draft(db, current_user.id, draft_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/{draft_id}", response_model=DraftRead)
def update_draft(
    draft_id: UUID,
    data: DraftUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a draft (content, recipient, status)."""
    try:
        return DraftService.update_draft(
            db, current_user.id, draft_id, data
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{draft_id}/send", status_code=200)
def mark_as_sent(
    draft_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a draft as sent."""
    try:
        DraftService.mark_sent(db, current_user.id, draft_id)
        return {"message": "Draft marked as sent"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{draft_id}", status_code=204)
def discard_draft(
    draft_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Discard a draft."""
    try:
        DraftService.discard_draft(db, current_user.id, draft_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

---

## Frontend Tasks

### 7.5 — Draft Service (`services/draftService.js`)

```javascript
import api from './api';

const draftService = {
  createDraft: async (data) => {
    const response = await api.post('/api/v1/drafts', data);
    return response.data;
  },
  getDrafts: async (status = null, taskId = null) => {
    const params = {};
    if (status) params.status = status;
    if (taskId) params.task_id = taskId;
    const response = await api.get('/api/v1/drafts', { params });
    return response.data;
  },
  getDraft: async (draftId) => {
    const response = await api.get(`/api/v1/drafts/${draftId}`);
    return response.data;
  },
  updateDraft: async (draftId, data) => {
    const response = await api.patch(`/api/v1/drafts/${draftId}`, data);
    return response.data;
  },
  markSent: async (draftId) => {
    const response = await api.post(`/api/v1/drafts/${draftId}/send`);
    return response.data;
  },
  discardDraft: async (draftId) => {
    await api.delete(`/api/v1/drafts/${draftId}`);
  },
};

export default draftService;
```

### 7.6 — Draft Card Component (`components/DraftCard.jsx`)

**Design:**
- Content preview (first 100 chars)
- Recipient name (if set)
- Draft type icon (📧 email, 💬 message, 📝 note)
- Status badge (generated=purple, edited=blue, sent=green, discarded=gray)
- Quick actions: Edit, Copy, Mark Sent, Discard

### 7.7 — Draft Editor Component (`components/DraftEditor.jsx`)

**Design:**
- Full-screen or large modal editor
- Textarea with the draft content (editable)
- **Header section:**
  - Recipient field (editable)
  - Subject line (for email drafts)
  - Draft type selector
- **Footer actions:**
  - "Save Changes" button
  - "Copy to Clipboard" button (with visual feedback)
  - "Mark as Sent" button
  - "Discard" button (with confirmation dialog)
  - "Regenerate" button (links to Story 15) with tone selector
- **Sidebar info:**
  - Linked task title
  - Original AI-generated version (readonly, for comparison)
  - Version number
  - Created/updated timestamps

### 7.8 — Drafts Page (`pages/DraftsPage.jsx`)

- Tab/section in dashboard or standalone page
- Filter by status (All, Generated, Edited, Sent, Discarded)
- Grid or list of `DraftCard` components
- Click opens `DraftEditor`
- Empty state: "No drafts yet — submit an input with communication intent"

---

## Database Tasks

### 7.9 — Generate Migration

```bash
alembic revision --autogenerate -m "create_drafts_table"
alembic upgrade head
```

### 7.10 — Table Structure

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY |
| `task_id` | UUID | FOREIGN KEY → tasks.id ON DELETE SET NULL, NULLABLE |
| `input_id` | UUID | FOREIGN KEY → raw_inputs.id, NOT NULL |
| `user_id` | UUID | FOREIGN KEY → users.id, NOT NULL |
| `content` | TEXT | NOT NULL |
| `draft_type` | ENUM | NOT NULL, DEFAULT 'message' |
| `tone` | ENUM | NOT NULL, DEFAULT 'formal' |
| `recipient` | VARCHAR(255) | NULLABLE |
| `subject` | VARCHAR(255) | NULLABLE |
| `status` | ENUM | NOT NULL, DEFAULT 'generated' |
| `original_content` | TEXT | NULLABLE |
| `version` | INTEGER | DEFAULT 1 |
| `created_at` | TIMESTAMP | DEFAULT now() |
| `updated_at` | TIMESTAMP | DEFAULT now() |

### 7.11 — Indexes

- [ ] `(user_id, status)` — filtering drafts by status
- [ ] `(input_id)` — lookup drafts from a specific input
- [ ] `(task_id)` — lookup drafts linked to a task

---

## Acceptance Criteria

- [ ] `POST /api/v1/drafts` creates and returns a draft
- [ ] `GET /api/v1/drafts` returns user's drafts with filters
- [ ] `GET /api/v1/drafts/{id}` returns a single draft
- [ ] `PATCH /api/v1/drafts/{id}` updates content/fields; auto-sets status to `edited` on content change
- [ ] `POST /api/v1/drafts/{id}/send` marks draft as sent
- [ ] `DELETE /api/v1/drafts/{id}` marks draft as discarded
- [ ] Deleting a task sets the draft's `task_id` to NULL (not cascade-deleted)
- [ ] Original content is preserved even after edits
- [ ] Frontend draft editor allows editing and saving
- [ ] Copy-to-clipboard works

---

## Notes

- Drafts are NOT automatically sent — the user always reviews and decides.
- Story 15 will add AI-powered regeneration with tone selection.
- The `original_content` field lets users compare AI-generated vs their edits.
- Consider adding a "Revert to original" button in the editor.
