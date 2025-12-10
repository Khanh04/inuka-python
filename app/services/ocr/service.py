"""OCR service using pytesseract."""
import asyncio
import base64
import io
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional

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

    def _extract_region_text_sync(
        self,
        image: Image.Image,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        language: Optional[str] = None,
    ) -> str:
        """Extract text from a specific region of an image."""
        # Crop the region
        region = image.crop((int(x1), int(y1), int(x2), int(y2)))

        # Use configured language or default
        lang = language or settings.OCR_LANGUAGES

        # Extract text from region
        text = pytesseract.image_to_string(region, lang=lang)
        return text.strip()

    def _extract_fields_from_image_sync(
        self,
        image_data: bytes,
        page_params: List[Dict[str, Any]],
        language: Optional[str] = None,
    ) -> Dict[str, str]:
        """
        Extract text from multiple regions defined by page_params.

        Args:
            image_data: Image bytes
            page_params: List of field definitions with id, x1, y1, x2, y2
            language: OCR language

        Returns:
            Dictionary mapping field id to extracted text
        """
        image = Image.open(io.BytesIO(image_data))
        results = {}

        for param in page_params:
            field_id = param.get("id")
            if not field_id:
                continue

            try:
                x1 = float(param.get("x1", 0))
                y1 = float(param.get("y1", 0))
                x2 = float(param.get("x2", 0))
                y2 = float(param.get("y2", 0))

                # Skip invalid regions
                if x2 <= x1 or y2 <= y1:
                    logger.warning(f"Invalid region for field {field_id}: ({x1},{y1}) to ({x2},{y2})")
                    continue

                text = self._extract_region_text_sync(image, x1, y1, x2, y2, language)
                results[field_id] = text
                logger.debug(
                    f"Extracted field {field_id}: {text[:50]}..."
                    if len(text) > 50
                    else f"Extracted field {field_id}: {text}"
                )
            except Exception as e:
                logger.error(f"Failed to extract field {field_id}: {str(e)}")
                results[field_id] = ""

        return results

    async def extract_fields_from_base64(
        self,
        image_base64: str,
        page_params: List[Dict[str, Any]],
        language: Optional[str] = None,
    ) -> Dict[str, str]:
        """
        Extract text from regions defined by page_params from a base64 image.

        Args:
            image_base64: Base64 encoded image
            page_params: List of field definitions with id, x1, y1, x2, y2
            language: OCR language

        Returns:
            Dictionary mapping field id to extracted text
        """
        image_data = base64.b64decode(image_base64)
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor,
            self._extract_fields_from_image_sync,
            image_data,
            page_params,
            language,
        )

    async def extract_fields_from_pdf_base64(
        self,
        pdf_base64: str,
        all_page_params: Dict[str, List[Dict[str, Any]]],
        language: Optional[str] = None,
    ) -> Dict[str, str]:
        """
        Extract text from regions defined by all_page_params from a base64 PDF.

        Args:
            pdf_base64: Base64 encoded PDF
            all_page_params: Dict mapping page numbers (as strings) to list of field definitions
            language: OCR language

        Returns:
            Dictionary mapping field id to extracted text (merged from all pages)
        """
        pdf_data = base64.b64decode(pdf_base64)

        # Convert PDF pages to images
        loop = asyncio.get_event_loop()
        images = await loop.run_in_executor(
            self.executor,
            lambda: convert_from_bytes(pdf_data, dpi=300),
        )

        all_results = {}

        for page_num, image in enumerate(images, start=1):
            page_key = str(page_num)
            page_params = all_page_params.get(page_key, [])

            if not page_params:
                continue

            # Save image to bytes for processing
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format="PNG")
            img_bytes = img_byte_arr.getvalue()

            # Extract fields for this page
            page_results = await loop.run_in_executor(
                self.executor,
                self._extract_fields_from_image_sync,
                img_bytes,
                page_params,
                language,
            )

            # Merge results (later pages override earlier if same field id)
            all_results.update(page_results)

        return all_results
