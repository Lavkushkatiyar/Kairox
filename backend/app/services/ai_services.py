import requests

OLLAMA_URL = "http://localhost:11434/api/chat"
REQUEST_TIME_OUT = 600


class AIServices:
    def __init__(
        self,
        model,
    ):
        self.model = model

    def generate_response(self, message):
        model = self.model
        payload = self._build_payload(message)

        response = self._post_request(OLLAMA_URL, payload)
        content = self._extract_content(response, "ollama")
        self._print_ollama_metrics(response)

        return content

    def _build_payload(
        self,
        message,
    ) -> dict:
        return {
            "model": self.model,
            "messages": message,
            "stream": False,
            "think": False,
            "keep_alive": "30m",
            "options": {
                "temperature": 0,
                "num_ctx": 8192,
            },
        }

    def _post_request(self, url: str, payload) -> dict:
        print("its running with ", payload)

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
    ) -> str | None:
        if provider == "ollama":
            return result.get("message", {}).get("content")

        choices = result.get("choices", [])
        return choices[0].get("message", {}).get("content") if choices else None

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
