"""OCR API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import asyncio

from app.core.database import get_db
from app.schemas.ocr import OCRScanRequest, OCRJobResponse
from app.repositories.ocr_repository import OCRRepository
from app.services.ocr.service import OCRService
from app.models.ocr import OCRJob, JobStatus
from app.middleware.auth import verify_token

router = APIRouter(prefix="/ocr", tags=["OCR"])
ocr_service = OCRService()


@router.post("/scan", response_model=OCRJobResponse)
async def process_image(
    request: OCRScanRequest,
    db: AsyncSession = Depends(get_db),
    token: dict = Depends(verify_token),
):
    """Submit an image for OCR processing."""
    repo = OCRRepository(db)

    # Create OCR job
    job_id = str(uuid.uuid4())
    job = OCRJob(job_id=job_id, status=JobStatus.PENDING)
    job = await repo.create(job)

    # Process OCR asynchronously
    asyncio.create_task(process_ocr_task(job_id, request, db))

    return job


async def process_ocr_task(
    job_id: str, request: OCRScanRequest, db: AsyncSession
):
    """Background task to process OCR."""
    repo = OCRRepository(db)

    try:
        # Update status to processing
        await repo.update_status(job_id, JobStatus.PROCESSING)

        # Extract text
        if request.image_base64:
            result_text = await ocr_service.extract_text_from_base64(
                request.image_base64, request.language
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either image_base64 or image_url required",
            )

        # Update job with result
        await repo.update_status(
            job_id, JobStatus.COMPLETED, result_text=result_text
        )
    except Exception as e:
        # Update job with error
        await repo.update_status(
            job_id, JobStatus.FAILED, error_message=str(e)
        )


@router.get("/jobs/{job_id}", response_model=OCRJobResponse)
async def get_ocr_job_status(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    token: dict = Depends(verify_token),
):
    """Get OCR job status and results."""
    repo = OCRRepository(db)
    job = await repo.get_by_job_id(job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )

    return job
