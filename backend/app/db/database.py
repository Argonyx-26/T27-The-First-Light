"""
Database engine and session management for SQLite persistence.
"""

from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings


from pathlib import Path

# SQLite connection args (check_same_thread=False allows FastAPI multi-threaded requests)
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

db_url = settings.DATABASE_URL
if db_url.startswith("sqlite:///./") or db_url == "sqlite:///misconception_mapper.db":
    backend_db_path = (Path(__file__).resolve().parent.parent.parent / "misconception_mapper.db").resolve()
    db_url = f"sqlite:///{backend_db_path.as_posix()}"

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Creates all database tables defined in Base metadata and executes lightweight column migrations."""
    import app.db.models  # Ensure models are imported
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE misconception_states ADD COLUMN revision_priority FLOAT DEFAULT 0.0"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE sessions ADD COLUMN session_length INTEGER"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE sessions ADD COLUMN final_score FLOAT"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE sessions ADD COLUMN completed_at DATETIME"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE documents ADD COLUMN preview_text TEXT"))
            conn.commit()
        except Exception:
            pass

