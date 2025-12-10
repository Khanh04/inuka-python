"""OCR schemas for request/response."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.models.ocr import JobStatus


class OCRScanRequest(BaseModel):
    """Request schema for OCR scan."""

    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    language: Optional[str] = None


class OCRFieldParam(BaseModel):
    """Field parameter for region-based OCR extraction."""

    id: str
    x1: float
    y1: float
    x2: float
    y2: float
    type: Optional[str] = "string"
    isMultiline: Optional[bool] = False
    page: Optional[int] = None


class OCRExtractFieldsRequest(BaseModel):
    """Request schema for extracting fields from an image/PDF using defined regions."""

    image_base64: str
    page_params: Optional[List[OCRFieldParam]] = None  # For single image
    all_page_params: Optional[Dict[str, List[OCRFieldParam]]] = None  # For PDF with multiple pages
    form_id: Optional[int] = None  # Optionally load params from a form
    document_id: Optional[int] = None  # Optionally save results to a document
    language: Optional[str] = None


class OCRExtractFieldsResponse(BaseModel):
    """Response schema for field extraction."""

    fields: Dict[str, str]  # Map of field_id -> extracted text
    document_id: Optional[int] = None  # If results were saved to a document


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
