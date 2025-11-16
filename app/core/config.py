"""Application configuration using Pydantic Settings."""
from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings."""

    # Server
    PORT: int = 8080
    DEBUG: bool = False

    # Database - PostgreSQL
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
        """Get PostgreSQL database URL for SQLAlchemy."""
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

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
