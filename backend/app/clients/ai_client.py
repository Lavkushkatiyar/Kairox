from openai import OpenAI
from app.config import settings

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.AI_CLIENT_OPEN_KEY,
)
ai_model = "openai/gpt-4o"