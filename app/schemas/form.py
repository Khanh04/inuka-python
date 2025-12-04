"""Form schemas for request/response."""
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FormType(str, Enum):
    """Form type enumeration."""

    CUSTOMS_EXPORT = "customs_export"
    CUSTOMS_IMPORT = "customs_import"
    INVOICE = "invoice"
    PACKING_LIST = "packing_list"
    OTHER = "other"


class FormBase(BaseModel):
    """Base schema for form with common fields."""

    name: str | None = None
    form_type: FormType | None = Field(None, alias="formType")
    description: str | None = None
    template: dict[str, Any] | None = None
    all_page_params: dict[str, Any] | None = Field(None, alias="allPageParams")

    model_config = ConfigDict(populate_by_name=True)


class FormCreate(FormBase):
    """Schema for creating a form."""

    name: str
    form_type: FormType = Field(..., alias="formType")
    params: list[Any] | None = None  # Legacy field


class FormUpdate(FormBase):
    """Schema for updating a form."""

    params: list[Any] | None = None


class FormResponse(FormBase):
    """Response schema for form."""

    id: int
    template_id: int
    name: str
    form_type: FormType = Field(..., alias="formType")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
