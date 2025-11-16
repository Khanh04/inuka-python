"""OCR repository."""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.ocr import OCRJob
from app.repositories.base import BaseRepository


class OCRRepository(BaseRepository[OCRJob]):
    """Repository for OCR jobs."""

    def __init__(self, session: AsyncSession):
        super().__init__(OCRJob, session)

    async def get_by_job_id(self, job_id: str) -> Optional[OCRJob]:
        """Get OCR job by job_id."""
        result = await self.session.execute(select(OCRJob).where(OCRJob.job_id == job_id))
        return result.scalar_one_or_none()

    async def update_status(self, job_id: str, status: str, **kwargs) -> Optional[OCRJob]:
        """Update OCR job status."""
        job = await self.get_by_job_id(job_id)
        if job:
            job.status = status
            for key, value in kwargs.items():
                setattr(job, key, value)
            await self.session.commit()
            await self.session.refresh(job)
        return job
