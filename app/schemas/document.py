"""Document schemas for request/response."""
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class DocumentCreate(BaseModel):
    """Schema for creating a document."""

    image_data: str  # Base64 encoded image
    params: Optional[Dict[str, Any]] = None


class DocumentResponse(BaseModel):
    """Response schema for document."""

    id: int
    file_id: int
    form_id: int
    image_path: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
