"""Pytest configuration and fixtures."""
import asyncio
import os
from pathlib import Path
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app

# Import all models to ensure they're registered with Base.metadata
from app.models.document import Document  # noqa: F401
from app.models.file import File  # noqa: F401
from app.models.form import Form  # noqa: F401
from app.models.ocr import OCRJob  # noqa: F401
from app.models.template import Template  # noqa: F401
from app.models.user import User  # noqa: F401

# Test database file
TEST_DB_FILE = Path(__file__).parent / "test.db"
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_FILE}"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_engine():
    """Create a test database engine."""
    # Remove test database if it exists
    if TEST_DB_FILE.exists():
        TEST_DB_FILE.unlink()

    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Dispose and cleanup
    await engine.dispose()

    # Remove test database file
    if TEST_DB_FILE.exists():
        TEST_DB_FILE.unlink()


@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async_session_maker = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session_maker() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with test database."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:  # type: ignore
        yield ac

    app.dependency_overrides.clear()
