"""Form API endpoints."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import verify_token
from app.models.form import Form as FormModel
from app.repositories.form_repository import FormRepository
from app.repositories.template_repository import TemplateRepository
from app.schemas.form import FormCreate, FormResponse, FormUpdate

router = APIRouter(tags=["Forms"])


@router.get("/templates/{template_id}/forms", response_model=List[FormResponse])
async def get_forms(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Get all forms for a template."""
    # Verify template exists
    template_repo = TemplateRepository(db)
    template = await template_repo.get_by_id(template_id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    repo = FormRepository(db)
    forms = await repo.get_by_template_id(template_id)
    return forms


@router.post(
    "/templates/{template_id}/forms",
    response_model=FormResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_form(
    template_id: int,
    form_data: FormCreate,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Create a form with template data and parameters.

    Expects JSON payload with structure:
    {
        "description": "Template created on date",
        "template": {
            "source": {
                "type": "pdf",
                "filename": "uploaded.pdf",
                "allPages": [1, 2],
                "totalPages": 2
            },
            "data": [
                {
                    "page": 1,
                    "binary": "base64_encoded_image_data",
                    "size": {"width": 800, "height": 1131},
                    "type": "image/png"
                }
            ]
        },
        "params": [],
        "allPageParams": {
            "1": [
                {
                    "id": "Field Name",
                    "type": "string",
                    "x1": "100",
                    "y1": "100",
                    "x2": "200",
                    "y2": "120",
                    "isMultiline": false,
                    "page": 1
                }
            ]
        }
    }
    """
    # Verify template exists
    template_repo = TemplateRepository(db)
    template = await template_repo.get_by_id(template_id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    # Create form with template structure and page params
    repo = FormRepository(db)
    form = FormModel(
        template_id=template_id,
        name=form_data.name,
        form_type=form_data.form_type.value,
        description=form_data.description,
        template=form_data.template,
        all_page_params=form_data.all_page_params,
    )
    form = await repo.create(form)
    return form


@router.get("/templates/{template_id}/forms/{form_id}", response_model=FormResponse)
async def get_form(
    template_id: int,
    form_id: int,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Get a specific form."""
    repo = FormRepository(db)
    form = await repo.get_by_id(form_id)

    if not form or form.template_id != template_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    return form


@router.patch("/templates/{template_id}/forms/{form_id}", response_model=FormResponse)
async def update_form(
    template_id: int,
    form_id: int,
    form_data: FormUpdate,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Update a form."""
    repo = FormRepository(db)
    form = await repo.get_by_id(form_id)

    if not form or form.template_id != template_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    # Convert enum to string value for database
    update_data = form_data.model_dump(exclude_unset=True)
    if "form_type" in update_data and update_data["form_type"] is not None:
        update_data["form_type"] = update_data["form_type"].value

    form = await repo.update(form_id, **update_data)
    return form


@router.delete("/templates/{template_id}/forms/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_form(
    template_id: int,
    form_id: int,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Delete a form."""
    repo = FormRepository(db)
    form = await repo.get_by_id(form_id)

    if not form or form.template_id != template_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    await repo.delete(form_id)
