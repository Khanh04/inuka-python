"""Document repository."""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.document import Document
from app.repositories.base import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    """Repository for documents."""

    def __init__(self, session: AsyncSession):
        super().__init__(Document, session)

    async def get_by_file_id(self, file_id: int) -> List[Document]:
        """Get all documents for a file with form relationship loaded."""
        result = await self.session.execute(
            select(Document).where(Document.file_id == file_id).options(selectinload(Document.form))
        )
        return list(result.scalars().all())

    async def get_by_file_and_form(self, file_id: int, form_id: int) -> Optional[Document]:
        """Get a specific document by file_id and form_id."""
        result = await self.session.execute(
            select(Document).where(Document.file_id == file_id, Document.form_id == form_id)
        )
        return result.scalar_one_or_none()
