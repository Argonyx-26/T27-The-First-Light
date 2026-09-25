"""
Groq LLM provider implementation using HTTP requests.
Primary LLM provider using high-speed Llama-3.3-70b-versatile.
"""

from typing import Optional
import httpx
from app.llm.base import LLMProvider, LLMProviderError
from app.llm.schemas import LLMResponse


class GroqProvider(LLMProvider):
    """
    Primary LLM provider backed by Groq's high-speed inference API.
    Compatible with OpenAI-style chat completion schema.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "llama-3.3-70b-versatile",
        api_url: str = "https://api.groq.com/openai/v1/chat/completions",
        timeout_seconds: float = 15.0,
    ):
        self._api_key = api_key
        self._model = model
        self._api_url = api_url
        self._timeout_seconds = timeout_seconds

    @property
    def name(self) -> str:
        return "groq"

    @property
    def model_name(self) -> str:
        return self._model

    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        json_mode: bool = True,
        temperature: float = 0.2,
    ) -> LLMResponse:
        if not self._api_key or not self._api_key.strip():
            raise LLMProviderError(self.name, "GROQ_API_KEY is missing or empty", status_code=401)

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self._api_key.strip()}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self._model,
            "messages": messages,
            "temperature": temperature,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.post(self._api_url, headers=headers, json=payload)

            if response.status_code == 429:
                raise LLMProviderError(self.name, "Groq rate limit exceeded (HTTP 429)", status_code=429)

            if response.status_code >= 400:
                raise LLMProviderError(
                    self.name,
                    f"Groq API returned HTTP {response.status_code}: {response.text[:200]}",
                    status_code=response.status_code,
                )

            data = response.json()
            choice = data["choices"][0]["message"]["content"]
            usage = data.get("usage")

            return LLMResponse(
                provider=self.name,
                model=self._model,
                content=choice,
                usage=usage,
            )

        except httpx.RequestError as exc:
            raise LLMProviderError(self.name, f"Network error connecting to Groq: {exc}", status_code=503)
        except (KeyError, IndexError, ValueError) as exc:
            raise LLMProviderError(self.name, f"Malformed response from Groq: {exc}", status_code=502)
