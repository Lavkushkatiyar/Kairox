
from functools import lru_cache

from app.core.config import settings
from app.services.ai_services import AIServices


@lru_cache
def get_llm(
    provider: str = settings.AI_PROVIDER,
    model: str = settings.MODEL,
    API_KEY: str = settings.API_KEY,
    API_URL: str = settings.API_URL,
) -> AIServices:
    return AIServices(
        provider=provider,
        model=model,
        API_KEY=API_KEY,
        API_URL=API_URL,
    )
