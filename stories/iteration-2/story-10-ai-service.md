# Story 10: AI Integration — OpenAI Service Layer

| Field | Details |
|-------|---------|
| **Iteration** | 2 — Intelligence |
| **Story #** | 10 of 24 |
| **Priority** | 🔴 Critical |
| **Depends On** | Story 9 (Celery Setup) |
| **Blocks** | Story 11 (Processing Pipeline), Story 15 (Draft Pipeline) |
| **Estimated Effort** | 2–3 days |

---

## User Story

**As a** developer,  
**I want** a clean, testable service layer for OpenAI API calls,  
**So that** AI processing is abstracted, reliable, and easily swappable.

---

## Description

The AI Service is the brain of Kairox. It takes raw natural language and returns structured data. This story creates:

1. `AIService` class with methods for input parsing and draft generation.
2. Carefully crafted system prompts for reliable output.
3. Structured JSON output using OpenAI's function calling or JSON mode.
4. Retry logic, rate limiting, and token tracking.
5. `MockAIService` for testing without API calls.

---

## Backend Tasks

### 10.1 — Install Dependencies

```
pip install openai tiktoken
```

### 10.2 — Define Parsed Output Models (`schemas/ai_output.py`)

```python
from pydantic import BaseModel
from typing import Optional, List

class ExtractedTask(BaseModel):
    title: str
    description: Optional[str] = None
    due_expression: Optional[str] = None        # "tomorrow 11am", "tonight"
    priority: str = "medium"                     # low, medium, high, critical
    task_type: str = "action"                    # action, event, communication, review
    depends_on_titles: List[str] = []            # Titles of prerequisite tasks
    recipient: Optional[str] = None              # For communication tasks
    communication_intent: Optional[str] = None   # "inform", "request", "follow-up"

class ExtractedDraft(BaseModel):
    content: str
    recipient: Optional[str] = None
    draft_type: str = "message"          # email, message, note
    subject: Optional[str] = None        # For emails
    related_task_title: Optional[str] = None

class ParsedOutput(BaseModel):
    tasks: List[ExtractedTask]
    drafts: List[ExtractedDraft]
    interpretation: str              # AI's summary of what it understood
    confidence: float                # Overall confidence 0.0-1.0
```

### 10.3 — System Prompt Design

```python
SYSTEM_PROMPT = """You are Kairox, an AI workflow automation assistant.

Your job is to analyze natural language input and extract:
1. **Tasks** — actionable items the user needs to do
2. **Drafts** — message drafts for communication-related tasks
3. **Interpretation** — a brief summary of what you understood

## Rules for Task Extraction:

- Extract EVERY distinct action item mentioned
- Detect time references and preserve them as-is (e.g., "tomorrow", "tonight", "before 11")
- Identify task types:
  - "action" — something to do (default)
  - "event" — something to attend (meetings, calls)
  - "communication" — something to send/tell someone
  - "review" — something to check/verify
- Assess priority based on urgency words and deadlines
- Detect dependencies: if task B must happen before task A, note it
- For communication tasks, extract the recipient name

## Rules for Draft Generation:

- Generate a draft ONLY for tasks with type "communication"
- Keep drafts professional but natural
- Include the key information from context
- Do NOT auto-send — drafts are for review

## Output Format:

Return a JSON object with:
- tasks: array of extracted tasks
- drafts: array of generated drafts  
- interpretation: string summarizing your understanding
- confidence: float (0.0-1.0) for your parsing confidence

Be precise. Do not invent tasks that aren't in the input.
"""
```

### 10.4 — AI Service (`services/ai_service.py`)

```python
import openai
import json
import logging
from typing import Optional
from app.config import settings
from app.schemas.ai_output import ParsedOutput, ExtractedTask, ExtractedDraft

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o"
        self.total_tokens_used = 0

    def parse_input(self, text: str) -> ParsedOutput:
        """
        Parse natural language input into structured tasks and drafts.
        This is the CORE method of the entire system.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": text}
                ],
                temperature=0.3,  # Low temp for consistent extraction
                max_tokens=2000,
            )

            # Track token usage
            usage = response.usage
            self.total_tokens_used += usage.total_tokens
            logger.info(
                f"AI parse_input: {usage.prompt_tokens} prompt + "
                f"{usage.completion_tokens} completion = {usage.total_tokens} total"
            )

            # Parse JSON response
            content = response.choices[0].message.content
            data = json.loads(content)
            return ParsedOutput(**data)

        except json.JSONDecodeError as e:
            logger.error(f"AI returned invalid JSON: {e}")
            raise ValueError(f"AI response was not valid JSON: {e}")
        except openai.APIError as e:
            logger.error(f"OpenAI API error: {e}")
            raise

    def generate_draft(
        self, 
        context: str, 
        recipient: str = None,
        tone: str = "formal",
        additional_context: str = None
    ) -> str:
        """Generate a message draft based on context."""
        prompt = f"""Generate a {tone} message draft.

Context: {context}
{"Recipient: " + recipient if recipient else ""}
{"Additional instructions: " + additional_context if additional_context else ""}

Write only the message content. No subject line unless asked for email.
Keep it concise and professional."""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a professional message writer."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,  # Slightly creative for drafts
            max_tokens=500,
        )

        usage = response.usage
        self.total_tokens_used += usage.total_tokens
        return response.choices[0].message.content.strip()
```

### 10.5 — Mock AI Service (`services/mock_ai_service.py`)

```python
from app.schemas.ai_output import ParsedOutput, ExtractedTask, ExtractedDraft

class MockAIService:
    """Mock AI service for testing without API calls."""

    def parse_input(self, text: str) -> ParsedOutput:
        # Simple keyword-based extraction for testing
        tasks = []
        drafts = []
        
        # Split by common separators
        parts = text.replace(" and ", ", ").split(",")
        
        for part in parts:
            part = part.strip()
            if not part:
                continue
            
            task_type = "action"
            if any(w in part.lower() for w in ["meeting", "call", "event"]):
                task_type = "event"
            elif any(w in part.lower() for w in ["send", "inform", "tell", "email", "message", "draft"]):
                task_type = "communication"
            elif any(w in part.lower() for w in ["check", "review", "verify"]):
                task_type = "review"
            
            tasks.append(ExtractedTask(
                title=part[:100],
                task_type=task_type,
                priority="medium"
            ))
            
            if task_type == "communication":
                drafts.append(ExtractedDraft(
                    content=f"Regarding: {part}",
                    draft_type="message",
                    related_task_title=part[:100]
                ))
        
        return ParsedOutput(
            tasks=tasks,
            drafts=drafts,
            interpretation=f"Extracted {len(tasks)} tasks from input",
            confidence=0.85
        )

    def generate_draft(self, context, recipient=None, tone="formal", **kwargs):
        return f"Dear {recipient or 'Sir/Madam'},\n\nI wanted to update you regarding: {context}\n\nBest regards"
```

### 10.6 — Service Factory

```python
from app.config import settings

def get_ai_service():
    if settings.DEBUG and not settings.OPENAI_API_KEY:
        from app.services.mock_ai_service import MockAIService
        return MockAIService()
    from app.services.ai_service import AIService
    return AIService()
```

### 10.7 — Retry Logic with Backoff

Wrap in Celery task with retry (actual implementation in Story 11):
```python
# Retry config for AI calls
AI_RETRY_CONFIG = {
    "max_retries": 3,
    "retry_backoff": True,           # Exponential backoff
    "retry_backoff_max": 120,        # Max 2 minutes
    "retry_jitter": True,            # Add randomness
    "autoretry_for": (
        openai.APIConnectionError,
        openai.RateLimitError,
        openai.APITimeoutError,
    ),
}
```

---

## Frontend Tasks

No direct frontend changes in this story. The AI service is internal backend-only.

---

## Database Tasks

No database changes in this story.

---

## Acceptance Criteria

- [ ] `AIService.parse_input("Meeting tomorrow at 11, finish report before that")` returns structured `ParsedOutput`
- [ ] Tasks, drafts, interpretation, and confidence are correctly populated
- [ ] `MockAIService` works without any API key
- [ ] Token usage is logged for each call
- [ ] Invalid JSON from AI is handled gracefully
- [ ] Service factory returns mock in debug mode without API key
- [ ] Retry configuration is defined for transient API failures

---

## Notes

- **Temperature 0.3** for parsing (consistent) vs **0.7** for drafts (creative).
- Use `response_format={"type": "json_object"}` for reliable JSON output.
- The system prompt is the most important artifact — iterate on it as you test.
- `MockAIService` uses simple keyword matching — good enough for tests but not for demo.
- Consider `gpt-4o-mini` for cost savings once the prompt is stable.
