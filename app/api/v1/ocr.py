"""OCR API endpoints."""
import asyncio
import base64
import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, get_db
from app.middleware.auth import verify_token
from app.models.ocr import JobStatus, OCRJob
from app.repositories.document_repository import DocumentRepository
from app.repositories.form_repository import FormRepository
from app.repositories.ocr_repository import OCRRepository
from app.schemas.ocr import OCRExtractFieldsRequest, OCRExtractFieldsResponse, OCRJobResponse, OCRScanRequest
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


@router.post("/extract-fields", response_model=OCRExtractFieldsResponse)
async def extract_fields(
    request: OCRExtractFieldsRequest,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """
    Extract text from specific regions of an image/PDF based on field definitions.

    The field definitions can be provided directly via page_params/all_page_params,
    or loaded from a form by providing form_id.

    Each field definition should include:
    - id: The field identifier (maps to XML export field)
    - x1, y1, x2, y2: Bounding box coordinates
    - type: Optional field type (string, date, etc.)

    If document_id is provided, the extracted fields will be saved to that document's params.
    """
    # Get page params from request or load from form
    page_params = None
    all_page_params = None

    if request.form_id:
        # Load params from form
        form_repo = FormRepository(db)
        form = await form_repo.get_by_id(request.form_id)
        if not form:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

        if form.all_page_params:
            all_page_params = form.all_page_params
        elif form.params:
            # Legacy: params might be a flat list
            page_params = form.params
    else:
        # Use params from request
        if request.all_page_params:
            all_page_params = {
                page: [p.model_dump() for p in params] for page, params in request.all_page_params.items()
            }
        elif request.page_params:
            page_params = [p.model_dump() for p in request.page_params]

    if not page_params and not all_page_params:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No field parameters provided. Supply page_params, all_page_params, or form_id.",
        )

    # Detect if input is PDF or image
    try:
        image_data = base64.b64decode(request.image_base64)
        is_pdf = image_data.startswith(b"%PDF")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid base64 data: {str(e)}")

    # Extract fields
    if is_pdf and all_page_params:
        # Multi-page PDF extraction
        fields = await ocr_service.extract_fields_from_pdf_base64(
            request.image_base64,
            all_page_params,
            request.language,
        )
    elif page_params:
        # Single image extraction
        fields = await ocr_service.extract_fields_from_base64(
            request.image_base64,
            page_params,
            request.language,
        )
    elif all_page_params:
        # Single image but params organized by page - use page 1
        page_1_params = all_page_params.get("1", [])
        if not page_1_params:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No params found for page 1",
            )
        fields = await ocr_service.extract_fields_from_base64(
            request.image_base64,
            page_1_params,
            request.language,
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to determine extraction method",
        )

    # Optionally save to document
    document_id = None
    if request.document_id:
        doc_repo = DocumentRepository(db)
        document = await doc_repo.get_by_id(request.document_id)
        if document:
            # Merge with existing params
            existing_params = document.params or {}
            existing_params.update(fields)
            await doc_repo.update(request.document_id, params=existing_params)
            document_id = request.document_id
            logger.info(f"Saved extracted fields to document {document_id}")
        else:
            logger.warning(f"Document {request.document_id} not found, fields not saved")

    return OCRExtractFieldsResponse(fields=fields, document_id=document_id)
