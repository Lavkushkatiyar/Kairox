from app.core.config import settings
from llm.llm_factory import get_llm

llm = get_llm(
    provider="ollama",
    model=settings.MODEL,
    API_KEY=" ",
    API_URL=settings.API_URL,
)


user_message = "Prepare the project report by tomorrow. After finishing the report, email it to Aman. Once Aman has received it, schedule a review meeting for next week."

message = llm.createTaskFromRawInput(user_message)
print(message)
