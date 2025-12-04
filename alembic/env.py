import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context
from app.core.config import get_settings

# Import your models' Base
from app.core.database import Base

# Import all models to ensure they're registered with Base
from app.models import document, file, form, ocr, template, user

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Get settings and override sqlalchemy.url
settings = get_settings()

# Determine database URL based on environment - mirror app/core/database.py logic
# Priority: DATABASE_URL (Railway) > PG* variables > POSTGRES_* variables > SQLite
database_url_env = os.getenv("DATABASE_URL")
if database_url_env:
    # Railway/Heroku provide DATABASE_URL
    database_url = database_url_env
    # Handle postgres:// vs postgresql:// and remove asyncpg for alembic
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+psycopg2://", 1)
    else:
        database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1).replace(
            "+asyncpg", "+psycopg2"
        )
elif settings.PGHOST or (settings.POSTGRES_HOST and settings.POSTGRES_HOST != "localhost"):
    # Use PostgreSQL if configured
    database_url = settings.database_url.replace("+asyncpg", "+psycopg2")
else:
    # Fall back to SQLite for local development (same as application)
    database_url = settings.sqlite_url.replace("+aiosqlite", "")

config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
