"""Template schemas for request/response."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TemplateCreate(BaseModel):
    """Schema for creating a template."""

    name: str
    description: Optional[str] = None


class TemplateUpdate(BaseModel):
    """Schema for updating a template."""

    name: Optional[str] = None
    description: Optional[str] = None


class TemplateResponse(BaseModel):
    """Response schema for template."""

    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
