"""
Misconception Mapper (MM) - FastAPI Application Entry Point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router
from app.core.config import settings
from app.db.database import SessionLocal, init_db
from app.db.seed import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize tables and seed questions if empty
    init_db()
    with SessionLocal() as db:
        seed_database(db)
    yield
    # Shutdown: clean up resources if needed


app = FastAPI(
    title="Misconception Mapper API",
    description="Adaptive diagnostic learning engine identifying cognitive root causes behind student errors.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount core REST endpoints
app.include_router(api_router)

# Mount Showcase static directory if available
from pathlib import Path
from fastapi.staticfiles import StaticFiles

showcase_dir = Path(__file__).resolve().parent.parent.parent / "showcase"
if showcase_dir.exists():
    app.mount("/showcase", StaticFiles(directory=str(showcase_dir), html=True), name="showcase")


@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": "Misconception Mapper",
        "environment": settings.ENVIRONMENT,
        "llm_mode": settings.LLM_MODE,
    }

