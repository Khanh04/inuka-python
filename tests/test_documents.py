"""Tests for document endpoints."""
import base64
import io

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_upload_document_single_page(client: AsyncClient):
    """Test uploading a document with a single page."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a form
    form_response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={
            "name": "Test Form",
            "formType": "customs_export",
        },
    )
    form_id = form_response.json()["id"]

    # Create a file
    file_response = await client.post(
        "/api/files",
        json={"template_id": template_id, "name": "Test File"},
    )
    file_id = file_response.json()["id"]

    # Create a simple test image (1x1 transparent PNG)
    test_image = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )

    # Upload document with single page
    response = await client.post(
        f"/api/files/{file_id}/documents/{form_id}",
        files={
            "1": ("page1.png", io.BytesIO(test_image), "image/png"),
        },
        data={"page_count": "1"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["file_id"] == file_id
    assert data["form_id"] == form_id
    assert "id" in data
    assert "original_file" in data
    assert "1" in data["original_file"]
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.asyncio
async def test_upload_document_multiple_pages(client: AsyncClient):
    """Test uploading a document with multiple pages."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a form
    form_response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={
            "name": "Test Form",
            "formType": "customs_export",
        },
    )
    form_id = form_response.json()["id"]

    # Create a file
    file_response = await client.post(
        "/api/files",
        json={"template_id": template_id, "name": "Test File"},
    )
    file_id = file_response.json()["id"]

    # Create a simple test image
    test_image = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )

    # Upload document with 3 pages
    response = await client.post(
        f"/api/files/{file_id}/documents/{form_id}",
        files={
            "1": ("page1.png", io.BytesIO(test_image), "image/png"),
            "2": ("page2.png", io.BytesIO(test_image), "image/png"),
            "3": ("page3.png", io.BytesIO(test_image), "image/png"),
        },
        data={"page_count": "3"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["file_id"] == file_id
    assert data["form_id"] == form_id
    assert "original_file" in data
    assert "1" in data["original_file"]
    assert "2" in data["original_file"]
    assert "3" in data["original_file"]


@pytest.mark.asyncio
async def test_upload_document_missing_page_count(client: AsyncClient):
    """Test uploading a document without page_count fails."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a form
    form_response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={
            "name": "Test Form",
            "formType": "customs_export",
        },
    )
    form_id = form_response.json()["id"]

    # Create a file
    file_response = await client.post(
        "/api/files",
        json={"template_id": template_id, "name": "Test File"},
    )
    file_id = file_response.json()["id"]

    test_image = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )

    # Upload without page_count
    response = await client.post(
        f"/api/files/{file_id}/documents/{form_id}",
        files={
            "1": ("page1.png", io.BytesIO(test_image), "image/png"),
        },
    )

    assert response.status_code == 400
    assert "page_count is required" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_document_missing_page(client: AsyncClient):
    """Test uploading a document with missing page fails."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a form
    form_response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={
            "name": "Test Form",
            "formType": "customs_export",
        },
    )
    form_id = form_response.json()["id"]

    # Create a file
    file_response = await client.post(
        "/api/files",
        json={"template_id": template_id, "name": "Test File"},
    )
    file_id = file_response.json()["id"]

    test_image = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )

    # Upload with page_count=2 but only provide page 1
    response = await client.post(
        f"/api/files/{file_id}/documents/{form_id}",
        files={
            "1": ("page1.png", io.BytesIO(test_image), "image/png"),
        },
        data={"page_count": "2"},
    )

    assert response.status_code == 400
    assert "Page 2 file is missing" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_document_invalid_file_id(client: AsyncClient):
    """Test uploading a document with invalid file_id."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a form
    form_response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={
            "name": "Test Form",
            "formType": "customs_export",
        },
    )
    form_id = form_response.json()["id"]

    test_image = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )

    # Upload with non-existent file_id
    response = await client.post(
        f"/api/files/99999/documents/{form_id}",
        files={
            "1": ("page1.png", io.BytesIO(test_image), "image/png"),
        },
        data={"page_count": "1"},
    )

    assert response.status_code == 404
    assert "File not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_document_invalid_form_id(client: AsyncClient):
    """Test uploading a document with invalid form_id."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a file
    file_response = await client.post(
        "/api/files",
        json={"template_id": template_id, "name": "Test File"},
    )
    file_id = file_response.json()["id"]

    test_image = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )

    # Upload with non-existent form_id
    response = await client.post(
        f"/api/files/{file_id}/documents/99999",
        files={
            "1": ("page1.png", io.BytesIO(test_image), "image/png"),
        },
        data={"page_count": "1"},
    )

    assert response.status_code == 404
    assert "Form not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_update_existing_document(client: AsyncClient):
    """Test updating an existing document."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a form
    form_response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={
            "name": "Test Form",
            "formType": "customs_export",
        },
    )
    form_id = form_response.json()["id"]

    # Create a file
    file_response = await client.post(
        "/api/files",
        json={"template_id": template_id, "name": "Test File"},
    )
    file_id = file_response.json()["id"]

    test_image = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )

    # Upload initial document
    response1 = await client.post(
        f"/api/files/{file_id}/documents/{form_id}",
        files={
            "1": ("page1.png", io.BytesIO(test_image), "image/png"),
        },
        data={"page_count": "1"},
    )
    assert response1.status_code == 201
    doc_id = response1.json()["id"]

    # Upload again to update
    response2 = await client.post(
        f"/api/files/{file_id}/documents/{form_id}",
        files={
            "1": ("page1_updated.png", io.BytesIO(test_image), "image/png"),
            "2": ("page2.png", io.BytesIO(test_image), "image/png"),
        },
        data={"page_count": "2"},
    )

    assert response2.status_code == 201
    data = response2.json()
    assert data["id"] == doc_id  # Same document ID
    assert "1" in data["original_file"]
    assert "2" in data["original_file"]


@pytest.mark.asyncio
async def test_get_documents_by_file(client: AsyncClient):
    """Test getting all documents for a file."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create two forms
    form1_response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={
            "name": "Form 1",
            "formType": "customs_export",
        },
    )
    form1_id = form1_response.json()["id"]

    form2_response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={
            "name": "Form 2",
            "formType": "customs_import",
        },
    )
    form2_id = form2_response.json()["id"]

    # Create a file
    file_response = await client.post(
        "/api/files",
        json={"template_id": template_id, "name": "Test File"},
    )
    file_id = file_response.json()["id"]

    test_image = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )

    # Upload two documents
    await client.post(
        f"/api/files/{file_id}/documents/{form1_id}",
        files={
            "1": ("page1.png", io.BytesIO(test_image), "image/png"),
        },
        data={"page_count": "1"},
    )

    await client.post(
        f"/api/files/{file_id}/documents/{form2_id}",
        files={
            "1": ("page1.png", io.BytesIO(test_image), "image/png"),
        },
        data={"page_count": "1"},
    )

    # Get all documents for the file
    response = await client.get(f"/api/files/{file_id}/documents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2


@pytest.mark.asyncio
async def test_delete_document(client: AsyncClient):
    """Test deleting a document."""
    # Create a template
    template_response = await client.post(
        "/api/templates",
        json={"name": "Test Template", "description": "Test"},
    )
    template_id = template_response.json()["id"]

    # Create a form
    form_response = await client.post(
        f"/api/templates/{template_id}/forms",
        json={
            "name": "Test Form",
            "formType": "customs_export",
        },
    )
    form_id = form_response.json()["id"]

    # Create a file
    file_response = await client.post(
        "/api/files",
        json={"template_id": template_id, "name": "Test File"},
    )
    file_id = file_response.json()["id"]

    test_image = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )

    # Upload document
    upload_response = await client.post(
        f"/api/files/{file_id}/documents/{form_id}",
        files={
            "1": ("page1.png", io.BytesIO(test_image), "image/png"),
        },
        data={"page_count": "1"},
    )
    doc_id = upload_response.json()["id"]

    # Delete the document
    response = await client.delete(f"/api/files/{file_id}/documents/{doc_id}")
    assert response.status_code == 204

    # Verify document list is empty
    list_response = await client.get(f"/api/files/{file_id}/documents")
    assert len(list_response.json()) == 0
