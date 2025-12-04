"""Tests for file endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_file(client: AsyncClient):
    """Test creating a file."""
    # Create a template first
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a file
    response = await client.post(
        "/api/files",
        json={"template_id": template_id, "name": "Test File"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test File"
    assert data["template_id"] == template_id
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.asyncio
async def test_create_file_missing_template_id(client: AsyncClient):
    """Test creating a file without template_id fails."""
    response = await client.post(
        "/api/files",
        json={"name": "Test File"},
    )
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_get_files(client: AsyncClient):
    """Test getting all files."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create some files
    await client.post("/api/files", json={"template_id": template_id, "name": "File 1"})
    await client.post("/api/files", json={"template_id": template_id, "name": "File 2"})

    response = await client.get("/api/files")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2


@pytest.mark.asyncio
async def test_get_file_by_id(client: AsyncClient):
    """Test getting a specific file."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a file
    create_response = await client.post(
        "/api/files",
        json={"template_id": template_id, "name": "Test File"},
    )
    file_id = create_response.json()["id"]

    # Get the file
    response = await client.get(f"/api/files/{file_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == file_id
    assert data["name"] == "Test File"
    assert data["template_id"] == template_id


@pytest.mark.asyncio
async def test_get_file_not_found(client: AsyncClient):
    """Test getting a non-existent file."""
    response = await client.get("/api/files/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_file(client: AsyncClient):
    """Test updating a file."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a file
    create_response = await client.post(
        "/api/files",
        json={"template_id": template_id, "name": "Original Name"},
    )
    file_id = create_response.json()["id"]

    # Update the file
    response = await client.patch(
        f"/api/files/{file_id}",
        json={"name": "Updated Name"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_delete_file(client: AsyncClient):
    """Test deleting a file."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a file
    create_response = await client.post(
        "/api/files",
        json={"template_id": template_id, "name": "File to Delete"},
    )
    file_id = create_response.json()["id"]

    # Delete the file
    response = await client.delete(f"/api/files/{file_id}")
    assert response.status_code == 204

    # Verify it's deleted
    get_response = await client.get(f"/api/files/{file_id}")
    assert get_response.status_code == 404
