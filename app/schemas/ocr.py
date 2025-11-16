"""OCR schemas for request/response."""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.ocr import JobStatus


class OCRScanRequest(BaseModel):
    """Request schema for OCR scan."""

    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    language: Optional[str] = None


class OCRJobResponse(BaseModel):
    """Response schema for OCR job."""

    id: int
    job_id: str
    status: JobStatus
    result_text: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
