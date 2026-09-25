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

    # Primary LLM: Groq (Questions & Distractors)
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GROQ_API_URL: str = "https://api.groq.com/openai/v1/chat/completions"

    # Remediation & Multimodal Vision: Google Gemini
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_API_URL: str = "https://generativelanguage.googleapis.com/v1beta/models"

    # YouTube Data API v3 (Educational Video Retrieval)
    YOUTUBE_API_KEY: Optional[str] = None

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
