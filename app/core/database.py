"""Database connection and session management."""
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator

from app.core.config import get_settings

settings = get_settings()

# Determine database URL
# Priority: DATABASE_URL (Railway/Heroku) > PostgreSQL config > SQLite
if os.getenv("DATABASE_URL"):
    # Railway/Heroku provide DATABASE_URL
    database_url = os.getenv("DATABASE_URL")
    # Handle postgres:// vs postgresql:// (some providers use the old format)
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif not database_url.startswith("postgresql+asyncpg://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    connect_args = {}
elif settings.POSTGRES_HOST and settings.POSTGRES_HOST != "localhost":
    # Use PostgreSQL if configured
    database_url = settings.database_url
    connect_args = {}
else:
    # Fall back to SQLite for local development
    database_url = settings.sqlite_url
    connect_args = {"check_same_thread": False}

# Create async engine
engine = create_async_engine(
    database_url,
    echo=settings.DEBUG,
    connect_args=connect_args,
)

# Create session maker
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Declarative base for models
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
