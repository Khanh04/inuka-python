"""Form model."""
from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Form(Base):
    """Form model for template forms."""

    __tablename__ = "forms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("templates.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    image_path = Column(Text, nullable=True)
    image_data = Column(Text, nullable=True)  # Base64 encoded image
    params = Column(JSON, nullable=True)  # JSON parameters for the form
    all_page_params = Column(JSON, nullable=True)  # JSON for all page parameters
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    template = relationship("Template", back_populates="forms")
    documents = relationship("Document", back_populates="form")
