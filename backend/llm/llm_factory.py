from functools import lru_cache

from app.services.ai_services import AIServices


@lru_cache
def get_llm(provider, model, API_KEY, API_URL):

    return AIServices(provider=provider, model=model, API_KEY=API_KEY, API_URL=API_URL)
