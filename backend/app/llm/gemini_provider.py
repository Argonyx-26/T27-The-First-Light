"""
Google Gemini LLM provider implementation.
Acts as automatic fallback when Groq encounters rate limits, downtime, or network failures.
"""

from typing import Optional
import httpx
from app.llm.base import LLMProvider, LLMProviderError
from app.llm.schemas import LLMResponse


class GeminiProvider(LLMProvider):
    """
    Fallback LLM provider using Google's Gemini API (gemini-1.5-flash).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gemini-1.5-flash",
        api_url: str = "https://generativelanguage.googleapis.com/v1beta/models",
        timeout_seconds: float = 15.0,
    ):
        self._api_key = api_key
        self._model = model
        self._api_url = api_url
        self._timeout_seconds = timeout_seconds

    @property
    def name(self) -> str:
        return "gemini"

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
            raise LLMProviderError(self.name, "GEMINI_API_KEY is missing or empty", status_code=401)

        url = f"{self._api_url}/{self._model}:generateContent?key={self._api_key.strip()}"

        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

        generation_config = {
            "temperature": temperature,
        }
        if json_mode:
            generation_config["responseMimeType"] = "application/json"

        payload = {
            "contents": [
                {
                    "parts": [{"text": full_prompt}]
                }
            ],
            "generationConfig": generation_config,
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.post(url, json=payload)

            if response.status_code == 429:
                raise LLMProviderError(self.name, "Gemini rate limit exceeded (HTTP 429)", status_code=429)

            if response.status_code >= 400:
                raise LLMProviderError(
                    self.name,
                    f"Gemini API returned HTTP {response.status_code}: {response.text[:200]}",
                    status_code=response.status_code,
                )

            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise LLMProviderError(self.name, "No response candidates returned by Gemini", status_code=502)

            text = candidates[0]["content"]["parts"][0]["text"]
            usage = data.get("usageMetadata")

            return LLMResponse(
                provider=self.name,
                model=self._model,
                content=text,
                usage=usage,
            )

        except httpx.RequestError as exc:
            raise LLMProviderError(self.name, f"Network error connecting to Gemini: {exc}", status_code=503)
        except (KeyError, IndexError, ValueError) as exc:
            raise LLMProviderError(self.name, f"Malformed response from Gemini: {exc}", status_code=502)
