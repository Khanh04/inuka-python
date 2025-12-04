"""Schemas package for request/response models."""
from app.schemas.document import DocumentCreate, DocumentResponse
from app.schemas.file import FileCreate, FileResponse, FileUpdate
from app.schemas.form import FormCreate, FormResponse, FormType, FormUpdate
from app.schemas.ocr import OCRJobResponse, OCRScanRequest
from app.schemas.template import TemplateCreate, TemplateResponse, TemplateUpdate
from app.schemas.user import UserCreate, UserResponse, UserUpdate

__all__ = [
    # Document
    "DocumentCreate",
    "DocumentResponse",
    # File
    "FileCreate",
    "FileUpdate",
    "FileResponse",
    # Form
    "FormCreate",
    "FormUpdate",
    "FormResponse",
    "FormType",
    # OCR
    "OCRScanRequest",
    "OCRJobResponse",
    # Template
    "TemplateCreate",
    "TemplateUpdate",
    "TemplateResponse",
    # User
    "UserCreate",
    "UserUpdate",
    "UserResponse",
]
