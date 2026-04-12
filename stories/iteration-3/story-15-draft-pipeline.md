# Story 15: AI Draft Generation Pipeline

| Field | Details |
|-------|---------|
| **Iteration** | 3 — Automation |
| **Story #** | 15 of 24 |
| **Priority** | 🟡 High |
| **Depends On** | Story 7 (Drafts), Story 10 (AI Service) |
| **Estimated Effort** | 2 days |

---

## User Story

**As a** user,  
**I want** the system to auto-generate polished message drafts for communication tasks,  
**So that** I can review and send them quickly without writing from scratch.

---

## Description

Story 7 built the Draft model. Story 10 built the AI service. This story connects them:

1. Auto-trigger draft generation when a `communication` type task is created.
2. Regeneration endpoint with tone selection (formal, casual, brief).
3. Context-aware drafts that reference the original input and task details.

---

## Backend Tasks

### 15.1 — Draft Generation Celery Task

```python
@celery_app.task(bind=True, base=KairoxTask, max_retries=3)
def generate_draft_task(self, task_id: str):
    """Generate an AI draft for a communication task."""
    db = self.db
    task = db.query(Task).filter(Task.id == UUID(task_id)).first()
    if not task:
        return
    
    # Get context from related input
    raw_input = db.query(RawInput).filter(RawInput.id == task.input_id).first()
    context = raw_input.text if raw_input else task.title
    
    ai_service = get_ai_service()
    content = ai_service.generate_draft(
        context=context,
        recipient=None,  # Extracted from task metadata
        tone="formal"
    )
    
    draft = Draft(
        user_id=task.user_id,
        input_id=task.input_id,
        task_id=task.id,
        content=content,
        original_content=content,
        draft_type=DraftType.MESSAGE,
        tone=DraftTone.FORMAL,
        status=DraftStatus.GENERATED,
    )
    db.add(draft)
    db.commit()
```

### 15.2 — Regeneration Endpoint

```python
@router.post("/{draft_id}/regenerate", response_model=DraftRead)
def regenerate_draft(draft_id: UUID, data: DraftRegenerate, current_user, db):
    """Regenerate a draft with a different tone or additional context."""
    draft = DraftService.get_draft(db, current_user.id, draft_id)
    
    # Get original context
    raw_input = db.query(RawInput).filter(RawInput.id == draft.input_id).first()
    context = raw_input.text if raw_input else ""
    
    ai_service = get_ai_service()
    new_content = ai_service.generate_draft(
        context=context,
        recipient=draft.recipient,
        tone=data.tone.value,
        additional_context=data.additional_context
    )
    
    draft.content = new_content
    draft.tone = data.tone
    draft.version += 1
    draft.status = DraftStatus.GENERATED
    db.commit()
    db.refresh(draft)
    return draft
```

### 15.3 — Auto-Trigger in Pipeline

In Story 11's `process_input` task, after creating communication tasks:
```python
for task in created_tasks:
    if task.task_type == TaskType.COMMUNICATION:
        generate_draft_task.delay(str(task.id))
```

### 15.4 — Add `tone` Column Migration

```python
# Add DraftTone to drafts table
tone = Column(Enum(DraftTone), default=DraftTone.FORMAL)
```

---

## Frontend Tasks

### 15.5 — Regenerate Button with Tone Selector

In `DraftEditor.jsx`:
- "Regenerate" dropdown button with tone options:
  - 📝 Formal
  - 😊 Casual
  - ⚡ Brief
- Optional textbox for additional context/instructions
- Loading state during regeneration
- Version indicator: "v2 • Regenerated as casual"

### 15.6 — Inline Draft Preview on Communication Tasks

On communication `TaskCard`s:
- Show draft snippet below the task
- "View Draft" button → opens DraftEditor

---

## Acceptance Criteria

- [ ] Communication tasks auto-trigger draft generation
- [ ] Generated drafts are contextually relevant
- [ ] Regeneration with different tones works
- [ ] Version number increments on regeneration
- [ ] Original content is preserved
- [ ] Frontend shows tone selector and regenerate button
