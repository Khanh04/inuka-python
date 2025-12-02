"""Form model."""
from sqlalchemy import JSON, Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Form(Base):
    """Form model for template forms."""

    __tablename__ = "forms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("templates.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    form_type = Column(
        SQLEnum(
            "customs_export",
            "customs_import",
            "invoice",
            "packing_list",
            "other",
            name="form_type_enum",
        ),
        nullable=False,
        default="other",
    )
    description = Column(Text, nullable=True)
    template = Column(JSON, nullable=True)  # CapturedTemplate JSON structure
    all_page_params = Column(JSON, nullable=True)  # Map of page params
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    template_rel = relationship("Template", back_populates="forms")
    documents = relationship("Document", back_populates="form")
