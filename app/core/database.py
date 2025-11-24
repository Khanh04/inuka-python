"""Database connection and session management."""
import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Determine database URL
# Priority: DATABASE_URL (Railway auto-generated) > PG* variables (Railway) > POSTGRES_* variables > SQLite
if os.getenv("DATABASE_URL"):
    # Railway/Heroku provide DATABASE_URL
    database_url = os.getenv("DATABASE_URL")
    # Handle postgres:// vs postgresql:// (some providers use the old format)
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif not database_url.startswith("postgresql+asyncpg://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    connect_args = {}
    db_type = "PostgreSQL"
    db_source = "DATABASE_URL (Railway)"
    # Mask password in URL for logging
    safe_url = database_url.split('@')[1] if '@' in database_url else "unknown"
    logger.info(f"Database: {db_type} via {db_source} - Host: {safe_url}")
elif settings.PGHOST or (settings.POSTGRES_HOST and settings.POSTGRES_HOST != "localhost"):
    # Use PostgreSQL if configured (supports both Railway PG* and traditional POSTGRES_* variables)
    database_url = settings.database_url
    connect_args = {}
    db_type = "PostgreSQL"
    db_source = "PG* variables" if settings.PGHOST else "POSTGRES_* variables"
    host = settings.PGHOST or settings.POSTGRES_HOST
    port = settings.PGPORT or settings.POSTGRES_PORT
    database = settings.PGDATABASE or settings.POSTGRES_DB
    logger.info(f"Database: {db_type} via {db_source} - Host: {host}:{port}, Database: {database}")
else:
    # Fall back to SQLite for local development
    database_url = settings.sqlite_url
    connect_args = {"check_same_thread": False}
    db_type = "SQLite"
    db_source = "local development"
    logger.info(f"Database: {db_type} ({db_source}) - Path: {settings.SQLITE_DB_PATH}")

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
