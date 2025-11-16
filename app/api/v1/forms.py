"""Form API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import base64

from app.core.database import get_db
from app.schemas.form import FormCreate, FormUpdate, FormResponse
from app.repositories.form_repository import FormRepository
from app.repositories.template_repository import TemplateRepository
from app.models.form import Form as FormModel
from app.middleware.auth import verify_token

router = APIRouter(tags=["Forms"])


@router.get("/templates/{template_id}/forms", response_model=List[FormResponse])
async def get_forms(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    token: dict = Depends(verify_token),
):
    """Get all forms for a template."""
    # Verify template exists
    template_repo = TemplateRepository(db)
    template = await template_repo.get_by_id(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Template not found"
        )

    repo = FormRepository(db)
    forms = await repo.get_by_template_id(template_id)
    return forms


@router.post(
    "/templates/{template_id}/forms",
    response_model=FormResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_form(
    template_id: int,
    name: str = Form(...),
    image: UploadFile = FastAPIFile(...),
    db: AsyncSession = Depends(get_db),
    token: dict = Depends(verify_token),
):
    """Upload a form image for a template."""
    # Verify template exists
    template_repo = TemplateRepository(db)
    template = await template_repo.get_by_id(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Template not found"
        )

    # Read and encode image
    image_bytes = await image.read()
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    # Create form
    repo = FormRepository(db)
    form = FormModel(
        template_id=template_id, name=name, image_data=image_base64, params={}
    )
    form = await repo.create(form)
    return form


@router.get("/templates/{template_id}/forms/{form_id}", response_model=FormResponse)
async def get_form(
    template_id: int,
    form_id: int,
    db: AsyncSession = Depends(get_db),
    token: dict = Depends(verify_token),
):
    """Get a specific form."""
    repo = FormRepository(db)
    form = await repo.get_by_id(form_id)

    if not form or form.template_id != template_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Form not found"
        )

    return form


@router.patch("/templates/{template_id}/forms/{form_id}", response_model=FormResponse)
async def update_form(
    template_id: int,
    form_id: int,
    form_data: FormUpdate,
    db: AsyncSession = Depends(get_db),
    token: dict = Depends(verify_token),
):
    """Update a form."""
    repo = FormRepository(db)
    form = await repo.get_by_id(form_id)

    if not form or form.template_id != template_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Form not found"
        )

    form = await repo.update(form_id, **form_data.model_dump(exclude_unset=True))
    return form


@router.delete(
    "/templates/{template_id}/forms/{form_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_form(
    template_id: int,
    form_id: int,
    db: AsyncSession = Depends(get_db),
    token: dict = Depends(verify_token),
):
    """Delete a form."""
    repo = FormRepository(db)
    form = await repo.get_by_id(form_id)

    if not form or form.template_id != template_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Form not found"
        )

    await repo.delete(form_id)
