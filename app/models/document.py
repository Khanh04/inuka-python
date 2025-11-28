"""Document model."""
from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Document(Base):
    """Document model for file documents."""

    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    file_id = Column(Integer, ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(Text, nullable=True)
    original_file = Column(JSON, nullable=True)  # Map of original file data
    processing_file = Column(JSON, nullable=True)  # Map of matched pages (bytes)
    params = Column(JSON, nullable=True)  # Map of DeclarationParams
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    file = relationship("File", back_populates="documents")
    form = relationship("Form", back_populates="documents")
