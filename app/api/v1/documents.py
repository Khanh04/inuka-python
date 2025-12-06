"""Document API endpoints."""
import base64
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import verify_token
from app.models.document import Document
from app.repositories.document_repository import DocumentRepository
from app.repositories.file_repository import FileRepository
from app.repositories.form_repository import FormRepository
from app.schemas.document import DocumentCreate, DocumentResponse

router = APIRouter(tags=["Documents"])


@router.get("/files/{file_id}/documents", response_model=List[DocumentResponse])
async def get_documents(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Get all documents for a file."""
    # Verify file exists
    file_repo = FileRepository(db)
    file = await file_repo.get_by_id(file_id)
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    repo = DocumentRepository(db)
    documents = await repo.get_by_file_id(file_id)
    return documents


@router.post(
    "/files/{file_id}/documents/{form_id}",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    file_id: int,
    form_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """
    Upload a document with multiple pages for a file.

    The request should be multipart/form-data with:
    - page_count: Number of pages in the document
    - 1, 2, 3, etc.: File uploads for each page (keys are page numbers)
    """
    # Verify file exists
    file_repo = FileRepository(db)
    file = await file_repo.get_by_id(file_id)
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Verify form exists
    form_repo = FormRepository(db)
    form = await form_repo.get_by_id(form_id)
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    # Parse multipart form data
    form_data = await request.form()

    # Get page_count
    page_count_str = form_data.get("page_count")
    if not page_count_str:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="page_count is required")

    try:
        page_count = int(page_count_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="page_count must be a valid integer")

    if page_count < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="page_count must be at least 1")

    # Collect page files
    original_file: Dict[str, str] = {}

    for page_num in range(1, page_count + 1):
        page_key = str(page_num)
        page_file = form_data.get(page_key)

        if not page_file:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Page {page_num} file is missing")

        # Read and encode the page file
        if hasattr(page_file, "read"):
            # It's a file upload
            page_bytes = await page_file.read()
            page_base64 = base64.b64encode(page_bytes).decode("utf-8")
            original_file[page_key] = page_base64
        else:
            # It's text data (could be base64 or other format)
            original_file[page_key] = str(page_file)

    # Check if document already exists
    doc_repo = DocumentRepository(db)
    existing = await doc_repo.get_by_file_and_form(file_id, form_id)

    if existing:
        # Update existing document
        existing.original_file = original_file
        existing.params = {}
        await db.commit()
        await db.refresh(existing)
        return existing
    else:
        # Create new document
        document = Document(file_id=file_id, form_id=form_id, original_file=original_file, params={})
        document = await doc_repo.create(document)
        return document


@router.delete("/files/{file_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    file_id: int,
    document_id: int,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Delete a document."""
    repo = DocumentRepository(db)
    document = await repo.get_by_id(document_id)

    if not document or document.file_id != file_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    await repo.delete(document_id)
