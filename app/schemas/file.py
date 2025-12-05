"""File schemas for request/response."""
from datetime import datetime

from pydantic import BaseModel


class FileCreate(BaseModel):
    """Schema for creating a file."""

    template_id: int
    name: str


class FileUpdate(BaseModel):
    """Schema for updating a file."""

    name: str


class FileResponse(BaseModel):
    """Response schema for file."""

    id: int
    template_id: int
    name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
