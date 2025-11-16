"""OCR Job model."""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from enum import Enum

from app.core.database import Base


class JobStatus(str, Enum):
    """OCR Job status enum."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class OCRJob(Base):
    """OCR Job model for tracking OCR processing jobs."""

    __tablename__ = "ocr_jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(String(255), unique=True, nullable=False, index=True)
    status = Column(SQLEnum(JobStatus), default=JobStatus.PENDING, nullable=False)
    image_path = Column(Text, nullable=True)
    result_text = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
