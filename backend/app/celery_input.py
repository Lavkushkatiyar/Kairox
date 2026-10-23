from app.workers.tasks.process_input import process_rawInput

result = process_rawInput.delay("9ec0f2a7-30b5-4237-ab16-f1a744235224")


print("Celery task ID:", result.id)
print("Task result:", result.get(timeout=30))
