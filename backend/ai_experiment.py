from openai import OpenAI
from app.config import settings
from app.schemas.ai_response import ParsedOutput

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.AI_CLIENT_OPEN_KEY,
)

response = client.beta.chat.completions.parse(
    model="openai/gpt-4o",
    messages=[
        {
            "role": "system",
            "content": (
                "You are Kairox's task interpretation assistant. "
                "Extract actionable tasks from the user's message."
            ),
        },
        {
            "role": "user",
            "content": (
                "I have a meeting with Aman tomorrow at 11. "
                "Before that, finish the report and send it to him."
            ),
        },
    ],
    response_format=ParsedOutput,
    max_completion_tokens = 100
)

result = response.choices[0].message.parsed
for task in result:
    print(task)