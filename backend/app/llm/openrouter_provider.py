import base64
import json
import logging
from typing import Optional, List
import httpx

from app.llm.base import LLMProvider, LLMProviderError
from app.llm.schemas import LLMResponse

logger = logging.getLogger(__name__)

class OpenRouterPoolProvider(LLMProvider):
    def __init__(
        self,
        api_keys_str: Optional[str] = None,
        model: str = "meta-llama/llama-3.3-70b-instruct",
        api_url: str = "https://openrouter.ai/api/v1/chat/completions",
        timeout_seconds: float = 30.0,
    ):
        self._keys: List[str] = []
        if api_keys_str:
            self._keys = [k.strip() for k in api_keys_str.split(",") if k.strip()]
        
        self._model = model
        self._api_url = api_url
        self._timeout_seconds = timeout_seconds
        self._current_index = 0

    @property
    def name(self) -> str:
        return "openrouter"

    @property
    def model_name(self) -> str:
        return self._model

    def _get_current_key(self) -> str:
        if not self._keys:
            raise LLMProviderError(self.name, "No OpenRouter API keys available", status_code=401)
        return self._keys[self._current_index % len(self._keys)]

    def _rotate_key(self):
        if self._keys:
            self._current_index = (self._current_index + 1) % len(self._keys)

    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        json_mode: bool = True,
        temperature: float = 0.2,
    ) -> LLMResponse:
        if not self._keys:
            raise LLMProviderError(self.name, "OPEN_ROUTER_API is missing or empty", status_code=401)

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self._model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 3000,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        max_retries = len(self._keys)
        attempts = 0

        async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
            while attempts < max_retries:
                attempts += 1
                api_key = self._get_current_key()
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "http://localhost:5173", # OpenRouter requires referer
                    "X-Title": "Misconception Mapper",
                }

                try:
                    response = await client.post(self._api_url, headers=headers, json=payload)
                    
                    if response.status_code in (429, 402, 403):
                        logger.warning("OpenRouter API key starting with %s... returned HTTP %s. Rotating key...", api_key[:8], response.status_code)
                        self._rotate_key()
                        continue
                        
                    if response.status_code >= 400:
                        raise LLMProviderError(
                            self.name,
                            f"OpenRouter API returned HTTP {response.status_code}: {response.text[:200]}",
                            status_code=response.status_code,
                        )

                    data = response.json()
                    choices = data.get("choices", [])
                    if not choices:
                        raise LLMProviderError(self.name, "No response choices returned by OpenRouter", status_code=502)

                    msg = choices[0].get("message", {})
                    text = msg.get("content") or msg.get("reasoning") or ""
                    usage = data.get("usage")

                    return LLMResponse(
                        provider=self.name,
                        model=self._model,
                        content=text,
                        usage=usage,
                    )

                except httpx.RequestError as exc:
                    logger.warning("Network error with OpenRouter key %s...: %s", api_key[:8], exc)
                    self._rotate_key()
                    continue
                except (KeyError, IndexError, ValueError) as exc:
                    raise LLMProviderError(self.name, f"Malformed response from OpenRouter: {exc}", status_code=502)

        raise LLMProviderError(self.name, "All OpenRouter API keys failed or rate-limited", status_code=429)

    async def describe_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/png",
        prompt: Optional[str] = None,
    ) -> str:
        if not self._keys:
            raise LLMProviderError(self.name, "OPEN_ROUTER_API is missing or empty", status_code=401)

        b64_data = base64.b64encode(image_bytes).decode("utf-8")
        user_prompt = prompt or (
            "Describe this diagram or figure clearly and concisely for an educational study guide, "
            "focusing on key scientific principles, labels, and concepts illustrated."
        )

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64_data}"}}
                ]
            }
        ]

        payload = {
            "model": self._model,
            "messages": messages,
            "temperature": 0.2,
        }

        max_retries = len(self._keys)
        attempts = 0

        async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
            while attempts < max_retries:
                attempts += 1
                api_key = self._get_current_key()
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "Misconception Mapper",
                }

                try:
                    response = await client.post(self._api_url, headers=headers, json=payload)
                    
                    if response.status_code in (429, 402, 403):
                        logger.warning("OpenRouter API key starting with %s... returned HTTP %s for vision. Rotating key...", api_key[:8], response.status_code)
                        self._rotate_key()
                        continue
                        
                    if response.status_code >= 400:
                        raise LLMProviderError(
                            self.name,
                            f"OpenRouter API returned HTTP {response.status_code}: {response.text[:200]}",
                            status_code=response.status_code,
                        )

                    data = response.json()
                    choices = data.get("choices", [])
                    if not choices:
                        raise LLMProviderError(self.name, "No response choices returned by OpenRouter", status_code=502)

                    return choices[0]["message"]["content"].strip()

                except httpx.RequestError as exc:
                    logger.warning("Network error with OpenRouter key %s...: %s", api_key[:8], exc)
                    self._rotate_key()
                    continue
                except (KeyError, IndexError, ValueError) as exc:
                    raise LLMProviderError(self.name, f"Malformed response from OpenRouter: {exc}", status_code=502)

        raise LLMProviderError(self.name, "All OpenRouter API keys failed or rate-limited on vision request", status_code=429)
