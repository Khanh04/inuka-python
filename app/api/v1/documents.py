"""Document API endpoints."""
import base64
from typing import List

from fastapi import APIRouter, Depends
from fastapi import File as FastAPIFile
from fastapi import HTTPException, UploadFile, status
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


@router.put(
    "/files/{file_id}/documents/{form_id}",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    file_id: int,
    form_id: int,
    image: UploadFile = FastAPIFile(...),
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Upload a document image for a file."""
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

    # Check if document already exists
    doc_repo = DocumentRepository(db)
    existing = await doc_repo.get_by_file_and_form(file_id, form_id)

    # Read and encode image
    image_bytes = await image.read()
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    if existing:
        # Update existing document
        existing.image_data = image_base64
        await db.commit()
        await db.refresh(existing)
        return existing
    else:
        # Create new document
        document = Document(file_id=file_id, form_id=form_id, image_data=image_base64, params={})
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
