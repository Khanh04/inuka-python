"""File repository."""
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file import File
from app.repositories.base import BaseRepository


class FileRepository(BaseRepository[File]):
    """Repository for files."""

    def __init__(self, session: AsyncSession):
        super().__init__(File, session)
