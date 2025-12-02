"""Form schemas for request/response."""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class FormType(str, Enum):
    """Form type enumeration."""

    CUSTOMS_EXPORT = "customs_export"
    CUSTOMS_IMPORT = "customs_import"
    INVOICE = "invoice"
    PACKING_LIST = "packing_list"
    OTHER = "other"


class FormCreate(BaseModel):
    """Schema for creating a form.

    Matches the payload structure from the frontend template editor:
    - name: Human-readable name of the form
    - formType: Type/category of the form
    - description: Human-readable description of the template
    - template: Contains source metadata and data array with page images
    - params: Legacy field (currently unused)
    - allPageParams: Map of page numbers to parameter definitions
    """

    name: str
    form_type: FormType = Field(..., alias="formType")
    description: Optional[str] = None
    template: Optional[Dict[str, Any]] = None  # Contains source and data array
    params: Optional[Dict[str, Any]] = None  # Legacy field
    all_page_params: Optional[Dict[str, Any]] = Field(None, alias="allPageParams")  # Map of page params

    class Config:
        populate_by_name = True  # Allow both snake_case and camelCase


class FormUpdate(BaseModel):
    """Schema for updating a form."""

    name: Optional[str] = None
    form_type: Optional[FormType] = Field(None, alias="formType")
    description: Optional[str] = None
    template: Optional[Dict[str, Any]] = None
    params: Optional[Dict[str, Any]] = None
    all_page_params: Optional[Dict[str, Any]] = Field(None, alias="allPageParams")

    class Config:
        populate_by_name = True


class FormResponse(BaseModel):
    """Response schema for form."""

    id: int
    template_id: int
    name: str
    form_type: FormType = Field(..., alias="formType")
    description: Optional[str] = None
    template: Optional[Dict[str, Any]] = None
    all_page_params: Optional[Dict[str, Any]] = Field(None, alias="allPageParams")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
