from app.services.ai_services import AIServices

result = AIServices.parse_input(
    "I have a meeting with Aman tomorrow at 11. "
    "Before that, finish the report and send it to him."
)

print(result)