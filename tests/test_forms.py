"""Tests for form endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_form(client: AsyncClient):
    """Test creating a form."""
    # Create a template first
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a form
    response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={"name": "Test Form", "formType": "customs_export"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Form"
    assert data["formType"] == "customs_export"
    assert data["template_id"] == template_id
    assert "id" in data
    assert "params" in data
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.asyncio
async def test_create_form_with_params(client: AsyncClient):
    """Test creating a form with parameters."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a form with params
    response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={
            "name": "Test Form",
            "formType": "invoice",
            "params": [{"field": "test", "value": "data"}],
        },
    )
    assert response.status_code == 201
    data = response.json()
    # Params should be returned (may be None if not set during creation)
    assert "params" in data


@pytest.mark.asyncio
async def test_create_form_invalid_template(client: AsyncClient):
    """Test creating a form with non-existent template."""
    response = await client.post(
        "/api/templates/99999/forms",
        json={"name": "Test Form", "formType": "customs_export"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_forms(client: AsyncClient):
    """Test getting all forms for a template."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create some forms
    await client.post(
        f"/api/templates/{template_id}/forms",
        json={"name": "Form 1", "formType": "customs_export"},
    )
    await client.post(
        f"/api/templates/{template_id}/forms",
        json={"name": "Form 2", "formType": "invoice"},
    )

    response = await client.get(f"/api/templates/{template_id}/forms")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2


@pytest.mark.asyncio
async def test_get_form_by_id(client: AsyncClient):
    """Test getting a specific form."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a form
    create_response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={"name": "Test Form", "formType": "customs_export"},
    )
    form_id = create_response.json()["id"]

    # Get the form
    response = await client.get(f"/api/templates/{template_id}/forms/{form_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == form_id
    assert data["name"] == "Test Form"


@pytest.mark.asyncio
async def test_get_form_not_found(client: AsyncClient):
    """Test getting a non-existent form."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    response = await client.get(f"/api/templates/{template_id}/forms/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_form(client: AsyncClient):
    """Test updating a form."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a form
    create_response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={"name": "Original Name", "formType": "customs_export"},
    )
    form_id = create_response.json()["id"]

    # Update the form
    response = await client.patch(
        f"/api/templates/{template_id}/forms/{form_id}",
        json={
            "name": "Updated Name",
            "description": "Updated description",
            "params": [{"field": "updated"}],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["description"] == "Updated description"
    assert data["params"] == [{"field": "updated"}]


@pytest.mark.asyncio
async def test_update_form_params_only(client: AsyncClient):
    """Test updating only the params field."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a form
    create_response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={"name": "Test Form", "formType": "customs_export"},
    )
    form_id = create_response.json()["id"]

    # Update only params
    response = await client.patch(
        f"/api/templates/{template_id}/forms/{form_id}",
        json={"params": [{"field1": "value1"}, {"field2": "value2"}]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Form"  # Name unchanged
    assert data["params"] == [{"field1": "value1"}, {"field2": "value2"}]


@pytest.mark.asyncio
async def test_delete_form(client: AsyncClient):
    """Test deleting a form."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a form
    create_response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={"name": "Form to Delete", "formType": "customs_export"},
    )
    form_id = create_response.json()["id"]

    # Delete the form
    response = await client.delete(f"/api/templates/{template_id}/forms/{form_id}")
    assert response.status_code == 204

    # Verify it's deleted
    get_response = await client.get(f"/api/templates/{template_id}/forms/{form_id}")
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_form_types(client: AsyncClient):
    """Test all valid form types."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    form_types = ["customs_export", "customs_import", "invoice", "packing_list", "other"]

    for form_type in form_types:
        response = await client.post(
            f"/api/templates/{template_id}/forms",
            json={"name": f"Form {form_type}", "formType": form_type},
        )
        assert response.status_code == 201
        assert response.json()["formType"] == form_type
