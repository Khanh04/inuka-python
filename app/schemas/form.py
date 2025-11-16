"""Form schemas for request/response."""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class FormCreate(BaseModel):
    """Schema for creating a form."""

    name: str
    image_data: Optional[str] = None  # Base64 encoded image
    params: Optional[Dict[str, Any]] = None
    all_page_params: Optional[Dict[str, Any]] = None


class FormUpdate(BaseModel):
    """Schema for updating a form."""

    name: Optional[str] = None
    image_data: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    all_page_params: Optional[Dict[str, Any]] = None


class FormResponse(BaseModel):
    """Response schema for form."""

    id: int
    template_id: int
    name: str
    image_path: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    all_page_params: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
