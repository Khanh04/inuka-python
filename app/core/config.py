"""Application configuration using Pydantic Settings."""
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Server
    PORT: int = 8080
    DEBUG: bool = False

    # Database - Railway PostgreSQL Variables (priority)
    PGHOST: Optional[str] = None
    PGPORT: Optional[int] = None
    PGUSER: Optional[str] = None
    PGPASSWORD: Optional[str] = None
    PGDATABASE: Optional[str] = None

    # Database - PostgreSQL (traditional naming - fallback)
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "inuka"
    POSTGRES_PASSWORD: str = "your_password"
    POSTGRES_DB: str = "inuka_template_db"

    # Database - SQLite
    SQLITE_DB_PATH: str = "./sqlite.db"

    # JWT
    JWT_SECRET: str = "change-this-secret-in-production-environment"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # OCR
    TESSERACT_PATH: Optional[str] = None
    TESSDATA_PATH: Optional[str] = None
    OCR_LANGUAGES: str = "eng"

    # Worker Pool
    WORKER_POOL_SIZE: int = 20

    @property
    def database_url(self) -> str:
        """Get PostgreSQL database URL for SQLAlchemy.

        Prioritizes Railway-style PG* variables, falls back to POSTGRES_* variables.
        """
        # Use Railway-style variables if available
        host = self.PGHOST or self.POSTGRES_HOST
        port = self.PGPORT or self.POSTGRES_PORT
        user = self.PGUSER or self.POSTGRES_USER
        password = self.PGPASSWORD or self.POSTGRES_PASSWORD
        database = self.PGDATABASE or self.POSTGRES_DB

        return f"postgresql+asyncpg://{user}:" f"{password}@{host}:" f"{port}/{database}"

    @property
    def sqlite_url(self) -> str:
        """Get SQLite database URL for SQLAlchemy."""
        return f"sqlite+aiosqlite:///{self.SQLITE_DB_PATH}"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
