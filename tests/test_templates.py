"""Tests for template endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_template(client: AsyncClient):
    """Test creating a template."""
    response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test description"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Template"
    assert data["description"] == "Test description"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.asyncio
async def test_get_templates(client: AsyncClient):
    """Test getting all templates."""
    # Create some templates first
    await client.post("/api/templates", json={"name": "Template 1", "description": "Desc 1"})
    await client.post("/api/templates", json={"name": "Template 2", "description": "Desc 2"})

    response = await client.get("/api/templates")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2


@pytest.mark.asyncio
async def test_get_template_by_id(client: AsyncClient):
    """Test getting a specific template."""
    # Create a template
    create_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test description"},
    )
    template_id = create_response.json()["id"]

    # Get the template
    response = await client.get(f"/api/templates/{template_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == template_id
    assert data["name"] == "Test Template"


@pytest.mark.asyncio
async def test_get_template_not_found(client: AsyncClient):
    """Test getting a non-existent template."""
    response = await client.get("/api/templates/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_template(client: AsyncClient):
    """Test updating a template."""
    # Create a template
    create_response = await client.post(
        "/api/templates",
        json={"name": "Original Name", "description": "Original description"},
    )
    template_id = create_response.json()["id"]

    # Update the template
    response = await client.patch(
        f"/api/templates/{template_id}",
        json={"name": "Updated Name", "description": "Updated description"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["description"] == "Updated description"


@pytest.mark.asyncio
async def test_delete_template(client: AsyncClient):
    """Test deleting a template."""
    # Create a template
    create_response = await client.post(
        "/api/templates",
        json={"name": "Template to Delete", "description": "Will be deleted"},
    )
    template_id = create_response.json()["id"]

    # Delete the template
    response = await client.delete(f"/api/templates/{template_id}")
    assert response.status_code == 204

    # Verify it's deleted
    get_response = await client.get(f"/api/templates/{template_id}")
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_delete_template_cascades(client: AsyncClient):
    """Test that deleting a template cascades to files and forms."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a file for the template
    file_response = await client.post(
        "/api/files",
        json={"template_id": template_id, "name": "Test File"},
    )
    file_id = file_response.json()["id"]

    # Create a form for the template
    form_response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={"name": "Test Form", "formType": "customs_export"},
    )
    form_id = form_response.json()["id"]

    # Delete the template
    delete_response = await client.delete(f"/api/templates/{template_id}")
    assert delete_response.status_code == 204

    # Verify template is deleted
    template_check = await client.get(f"/api/templates/{template_id}")
    assert template_check.status_code == 404

    # Verify form endpoint returns 404 since template is gone
    form_check = await client.get(f"/api/templates/{template_id}/forms")
    assert form_check.status_code == 404
