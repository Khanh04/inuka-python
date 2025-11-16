"""Document model."""
from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Document(Base):
    """Document model for file documents."""

    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    file_id = Column(Integer, ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True)
    image_path = Column(Text, nullable=True)
    image_data = Column(Text, nullable=True)  # Base64 encoded image
    params = Column(JSON, nullable=True)  # JSON parameters for document-specific overrides
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    file = relationship("File", back_populates="documents")
    form = relationship("Form", back_populates="documents")
