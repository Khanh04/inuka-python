"""Template repository."""
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.template import Template
from app.repositories.base import BaseRepository


class TemplateRepository(BaseRepository[Template]):
    """Repository for templates."""

    def __init__(self, session: AsyncSession):
        super().__init__(Template, session)
