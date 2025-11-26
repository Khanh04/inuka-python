"""Form repository."""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.form import Form
from app.repositories.base import BaseRepository


class FormRepository(BaseRepository[Form]):
    """Repository for forms."""

    def __init__(self, session: AsyncSession):
        super().__init__(Form, session)

    async def get_by_template_id(self, template_id: int) -> List[Form]:
        """Get all forms for a template."""
        result = await self.session.execute(select(Form).where(Form.template_id == template_id))
        return list(result.scalars().all())
