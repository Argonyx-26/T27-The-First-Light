"""
Application configuration for Misconception Mapper (MM).
Loads environment variables safely without hardcoding secrets.
"""

from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite:///./misconception_mapper.db"

    # LLM Settings
    # Mode can be "live" (uses Groq/Gemini APIs) or "mock" (offline deterministic fixtures)
    LLM_MODE: str = "live"

    # OpenRouter API (Comma separated keys)
    OPEN_ROUTER_API: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None # Fallback alias

    OPENROUTER_DIAGNOSTIC_MODEL: str = "qwen/qwen3.8-flash"
    OPENROUTER_REMEDIATION_MODEL: str = "google/gemini-2.5-flash"
    OPENROUTER_API_URL: str = "https://openrouter.ai/api/v1/chat/completions"

    # YouTube Data API v3 (Educational Video Retrieval)
    YOUTUBE_API_KEY: Optional[str] = None

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
