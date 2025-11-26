"""Template API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.schemas.template import TemplateCreate, TemplateUpdate, TemplateResponse
from app.repositories.template_repository import TemplateRepository
from app.models.template import Template
from app.middleware.auth import verify_token

router = APIRouter(prefix="/templates", tags=["Templates"])


@router.get("", response_model=List[TemplateResponse])
async def get_templates(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Get all templates."""
    repo = TemplateRepository(db)
    templates = await repo.get_all(skip=skip, limit=limit)
    return templates


@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Create a new template."""
    repo = TemplateRepository(db)
    template = Template(**template_data.model_dump())
    template = await repo.create(template)
    return template


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Get a specific template."""
    repo = TemplateRepository(db)
    template = await repo.get_by_id(template_id)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Template not found"
        )

    return template


@router.patch("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    template_data: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Update a template."""
    repo = TemplateRepository(db)
    template = await repo.update(template_id, **template_data.model_dump(exclude_unset=True))

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Template not found"
        )

    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    # token: dict = Depends(verify_token),  # Temporarily disabled
):
    """Delete a template."""
    repo = TemplateRepository(db)
    deleted = await repo.delete(template_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Template not found"
        )
