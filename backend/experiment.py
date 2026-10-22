from app.core.config import settings
from llm.llm_factory import get_llm

OLLAMA_URL = "http://localhost:11434/api/chat"

ollamaAI = get_llm(
    provider="ollama", model=settings.MODEL, API_URL=OLLAMA_URL, API_KEY=" "
)


SYSTEM_PROMPT = """
You are Kairox's task interpretation assistant.
Extract actionable work from the user’s text and classify it into structured tasks.

RULES:
- ONLY create a task when the user explicitly states something that needs doing.
- DO NOT create a task simply because an event, time, or location is mentioned.
- If the user says “I have X”, “there is X”, “I will do X”, or similar — DO NOT create a task unless the sentence contains an action verb.
- Time expressions (tomorrow, 11 AM, next week, etc.) must be preserved exactly as written.
- Do not convert time expressions into exact dates or normalize them.
- Assign priority based on context and urgency.

"""


message = [
    {"role": "system", "content": SYSTEM_PROMPT},
    {
        "role": "user",
        "content": "I have a meeting with Aman tomorrow at 11. Before that, finish the report.",
    },
]

output = ollamaAI.generate_response(message)

print(output)
