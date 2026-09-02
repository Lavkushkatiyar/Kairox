from app.schemas.ai_response import ParsedOutput
from app.clients.ai_client import client,ai_model


class AIServices:
    @staticmethod
    def parse_input(text:str)-> ParsedOutput:

        response = client.beta.chat.completions.parse(
        model=ai_model,
        messages=[
        {
           "role": "system",
    "content": (
        "You are Kairox's task interpretation assistant. "
        "Extract only actionable work that the user needs to perform. "
        "Do not create tasks merely because an event is mentioned. "
        "Classify each task by its semantic type. "
        "Preserve time expressions from the user's message instead of "
        "converting them into exact dates or times. "
        "Assign priority based on the user's wording and context."
    )
        },
        {
            "role": "user",
            "content": text
        },
    ],
    response_format=ParsedOutput,
    max_completion_tokens = 100
)
        return response.choices[0].message.parsed
    