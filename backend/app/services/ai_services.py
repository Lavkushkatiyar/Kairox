import requests
from app.schemas.ai_response import AI_TASK_FORMAT
from app.schemas.task import TaskCreate
from llm.get_prompt_message import get_prompted_message

REQUEST_TIME_OUT = 600


class AIServices:
    def __init__(
        self,
        provider,
        model,
        API_URL,
        API_KEY,
    ):
        self.API_URL = API_URL
        self.API_KEY = API_KEY
        self.provider = provider
        self.model = model

    def generate_response(self, message) -> list[TaskCreate]:
        payload = self._build_payload(message)

        response = self._post_request(self.API_URL, payload)
        content = self._extract_content(response, self.provider)
        self._print_ollama_metrics(response)

        return content

    def _build_payload(
        self,
        message,
    ) -> dict:
        payload_message = get_prompted_message(message)
        return {
            "model": self.model,
            "messages": payload_message,
            "stream": False,
            "think": False,
            "keep_alive": "30m",
            "format": AI_TASK_FORMAT.model_json_schema(),
            "options": {
                "temperature": 0,
                "num_ctx": 8192,
            },
        }

    def _post_request(self, url: str, payload) -> dict:
        response = requests.post(
            url,
            json=payload,
            timeout=REQUEST_TIME_OUT,
        )

        if not response.ok:
            print(f"LLM endpoint: {url}")
            print(f"HTTP status: {response.status_code}")
            print(f"LLM error: {response.text}")

        response.raise_for_status()
        return response.json()

    @staticmethod
    def _extract_content(
        result: dict,
        provider: str,
    ) -> dict | None:
        print(result)

        if provider == "ollama":
            output = result.get("message", {}).get("content")
            return AI_TASK_FORMAT.model_validate_json(output).model_dump()

        choices = result.get("choices", [])
        output = choices[0].get("message", {}).get("content") if choices else None
        output = AI_TASK_FORMAT.model_validate(output)
        return output.model_dump()

    @staticmethod
    def _print_ollama_metrics(result: dict) -> None:
        duration_keys = (
            "load_duration",
            "prompt_eval_duration",
            "eval_duration",
            "total_duration",
        )

        metrics = {
            key: (
                round(result[key] / 1_000_000_000, 3)
                if isinstance(result.get(key), (int, float))
                else None
            )
            for key in duration_keys
        }

        metrics["prompt_eval_count"] = result.get("prompt_eval_count")
        metrics["eval_count"] = result.get("eval_count")

        print(f"Ollama metrics: {metrics}")
