"""OCR service using pytesseract."""
import pytesseract
from PIL import Image
import io
import base64
from typing import Optional
from app.core.config import get_settings

settings = get_settings()


class OCRService:
    """Service for OCR operations using Tesseract."""

    def __init__(self):
        if settings.TESSERACT_PATH:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH

    async def extract_text(
        self, image_data: bytes, language: Optional[str] = None
    ) -> str:
        """Extract text from image using Tesseract OCR."""
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_data))

            # Use configured language or default
            lang = language or settings.OCR_LANGUAGES

            # Extract text
            text = pytesseract.image_to_string(image, lang=lang)
            return text.strip()
        except Exception as e:
            raise Exception(f"OCR processing failed: {str(e)}")

    async def extract_text_from_base64(
        self, image_base64: str, language: Optional[str] = None
    ) -> str:
        """Extract text from base64 encoded image."""
        # Decode base64 to bytes
        image_data = base64.b64decode(image_base64)
        return await self.extract_text(image_data, language)
