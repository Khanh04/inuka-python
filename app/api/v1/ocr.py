"""OCR API endpoints."""
import asyncio
import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, get_db
from app.middleware.auth import verify_token
from app.models.ocr import JobStatus, OCRJob
from app.repositories.ocr_repository import OCRRepository
from app.schemas.ocr import OCRJobResponse, OCRScanRequest
from app.services.ocr.service import OCRService

router = APIRouter(prefix="/ocr", tags=["OCR"])
ocr_service = OCRService()
logger = logging.getLogger(__name__)


@router.post("/scan", response_model=OCRJobResponse)
async def process_image(
    request: OCRScanRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Submit an image for OCR processing."""
    repo = OCRRepository(db)

    # Create OCR job
    job_id = str(uuid.uuid4())
    job = OCRJob(job_id=job_id, status=JobStatus.PENDING)
    job = await repo.create(job)

    # Add OCR processing to background tasks
    background_tasks.add_task(process_ocr_task, job_id, request)

    return job


async def process_ocr_task(job_id: str, request: OCRScanRequest):
    """Background task to process OCR."""
    # Create a new database session for this background task
    async with AsyncSessionLocal() as db:
        repo = OCRRepository(db)

        try:
            logger.info(f"Starting OCR processing for job {job_id}")

            # Update status to processing
            await repo.update_status(job_id, JobStatus.PROCESSING)

            # Extract text
            if request.image_base64:
                result_text = await ocr_service.extract_text_from_base64(request.image_base64, request.language)
            else:
                raise ValueError("Either image_base64 or image_url required")

            # Update job with result
            await repo.update_status(job_id, JobStatus.COMPLETED, result_text=result_text)
            logger.info(f"OCR processing completed for job {job_id}")

        except Exception as e:
            logger.error(f"OCR processing failed for job {job_id}: {str(e)}")
            # Update job with error
            await repo.update_status(job_id, JobStatus.FAILED, error_message=str(e))


@router.get("/jobs/{job_id}", response_model=OCRJobResponse)
async def get_ocr_job_status(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Get OCR job status and results."""
    repo = OCRRepository(db)
    job = await repo.get_by_job_id(job_id)

    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    return job
