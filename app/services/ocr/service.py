"""OCR service using pytesseract."""
import asyncio
import base64
import io
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class OCRService:
    """Service for OCR operations using Tesseract."""

    def __init__(self):
        if settings.TESSERACT_PATH:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH
        # Thread pool for CPU-bound OCR operations
        self.executor = ThreadPoolExecutor(max_workers=settings.WORKER_POOL_SIZE)

    def _is_pdf(self, data: bytes) -> bool:
        """Check if data is a PDF file by examining magic bytes."""
        return data.startswith(b"%PDF")

    def _extract_text_from_pdf_sync(self, pdf_data: bytes, language: Optional[str] = None) -> str:
        """Synchronous PDF to text extraction (runs in thread pool)."""
        logger.info("Converting PDF to images for OCR processing")

        # Convert PDF pages to images
        images = convert_from_bytes(pdf_data, dpi=300)

        # Use configured language or default
        lang = language or settings.OCR_LANGUAGES

        # Extract text from each page
        all_text = []
        for page_num, image in enumerate(images, start=1):
            logger.debug(f"Processing PDF page {page_num}/{len(images)}")
            page_text = pytesseract.image_to_string(image, lang=lang)
            if page_text.strip():
                all_text.append(f"--- Page {page_num} ---\n{page_text.strip()}")

        result = "\n\n".join(all_text)
        logger.info(f"Extracted text from {len(images)} PDF pages")
        return result

    def _extract_text_from_image_sync(self, image_data: bytes, language: Optional[str] = None) -> str:
        """Synchronous image text extraction (runs in thread pool)."""
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_data))

        # Use configured language or default
        lang = language or settings.OCR_LANGUAGES

        # Extract text
        text = pytesseract.image_to_string(image, lang=lang)
        return text.strip()

    async def extract_text(self, image_data: bytes, language: Optional[str] = None) -> str:
        """Extract text from image or PDF using Tesseract OCR."""
        try:
            # Check if it's a PDF
            if self._is_pdf(image_data):
                logger.info("Detected PDF file, using PDF extraction")
                # Run blocking PDF OCR operation in thread pool
                loop = asyncio.get_event_loop()
                text = await loop.run_in_executor(self.executor, self._extract_text_from_pdf_sync, image_data, language)
            else:
                logger.info("Detected image file, using direct OCR")
                # Run blocking image OCR operation in thread pool
                loop = asyncio.get_event_loop()
                text = await loop.run_in_executor(
                    self.executor, self._extract_text_from_image_sync, image_data, language
                )
            return text
        except Exception as e:
            raise Exception(f"OCR processing failed: {str(e)}")

    async def extract_text_from_base64(self, image_base64: str, language: Optional[str] = None) -> str:
        """Extract text from base64 encoded image or PDF."""
        # Decode base64 to bytes
        image_data = base64.b64decode(image_base64)
        return await self.extract_text(image_data, language)
