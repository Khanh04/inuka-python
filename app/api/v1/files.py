"""File API endpoints."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import verify_token
from app.models.vnaccs_export import DToKhaiMDData, VNACCSRoot
from app.models.file import File
from app.repositories.document_repository import DocumentRepository
from app.repositories.file_repository import FileRepository
from app.schemas.file import FileCreate, FileResponse, FileUpdate

router = APIRouter(prefix="/files", tags=["Files"])


@router.get("", response_model=List[FileResponse])
async def get_files(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Get all files."""
    repo = FileRepository(db)
    files = await repo.get_all(skip=skip, limit=limit)
    return files


@router.post("", response_model=FileResponse, status_code=status.HTTP_201_CREATED)
async def create_file(
    file_data: FileCreate,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Create a new file."""
    repo = FileRepository(db)
    file = File(**file_data.model_dump())
    file = await repo.create(file)
    return file


@router.get("/{file_id}", response_model=FileResponse)
async def get_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Get a specific file."""
    repo = FileRepository(db)
    file = await repo.get_by_id(file_id)

    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return file


@router.patch("/{file_id}", response_model=FileResponse)
async def update_file(
    file_id: int,
    file_data: FileUpdate,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Update a file."""
    repo = FileRepository(db)
    file = await repo.update(file_id, **file_data.model_dump(exclude_unset=True))

    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return file


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Delete a file."""
    repo = FileRepository(db)
    deleted = await repo.delete(file_id)

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")


@router.get("/{file_id}/export")
async def export_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Export file as XML customs declaration."""
    # Get file
    file_repo = FileRepository(db)
    file = await file_repo.get_by_id(file_id)
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Get all documents for the file
    doc_repo = DocumentRepository(db)
    documents = await doc_repo.get_by_file_id(file_id)

    # Build VNACCS XML structure
    vnaccs_root = VNACCSRoot()

    # Merge parameters from documents
    merged_params = {}
    for doc in documents:
        if doc.params:
            merged_params.update(doc.params)
        if doc.form and doc.form.params:
            merged_params.update(doc.form.params)

    # Create declaration data with VNACCS field mapping
    declaration_data = DToKhaiMDData()

    # Map common international fields to Vietnamese VNACCS fields
    field_mapping = {
        # International -> VNACCS mapping
        "DeclarationNo": "SOTK",
        "DeclarationDate": "NGAYDK",
        "VesselName": "TENPTVT",
        "VoyageNo": "VANDON",
        "BillOfLadingNo": "VANDON",
        "CurrencyCode": "MANT",
        "ExchangeRate": "TYGIAUSD",
        "TotalFOBValue": "TONGTGKB",
        "TotalCIFValue": "TONGTGTT",
        "TotalFreight": "PHIVC",
        "TotalInsurance": "PHIBH",
        "TransportModeCode": "MAPTVT",
        "CustomsOfficeCode": "MAHQ",
        "DeclarationKindCode": "MALH",
    }

    # Apply params to VNACCS declaration data
    for key, value in merged_params.items():
        # Try direct VNACCS field name first (if already using Vietnamese fields)
        if hasattr(declaration_data, key):
            setattr(declaration_data, key, str(value))
        # Try international field mapping
        elif key in field_mapping:
            vnaccs_field = field_mapping[key]
            setattr(declaration_data, vnaccs_field, str(value))

    vnaccs_root.declaration_data = declaration_data

    # Generate XML
    xml_content = vnaccs_root.to_xml()

    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="file_{file_id}_export.xml"'},
    )
