"""Tests for OCR endpoints."""
import base64

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_ocr_scan_with_base64(client: AsyncClient):
    """Test OCR scan with base64 encoded image."""
    # Create a minimal 1x1 PNG image in base64
    test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

    response = await client.post(
        "/api/ocr/scan",
        json={"image_base64": test_image},
    )
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert "status" in data
    assert data["status"] in ["pending", "processing", "completed", "failed"]


@pytest.mark.asyncio
async def test_ocr_scan_with_language(client: AsyncClient):
    """Test OCR scan with language parameter."""
    test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

    response = await client.post(
        "/api/ocr/scan",
        json={"image_base64": test_image, "language": "eng"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data


@pytest.mark.asyncio
async def test_ocr_get_job_status(client: AsyncClient):
    """Test getting OCR job status."""
    # Create a job first
    test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    scan_response = await client.post(
        "/api/ocr/scan",
        json={"image_base64": test_image},
    )
    job_id = scan_response.json()["job_id"]

    # Get the job status
    response = await client.get(f"/api/ocr/jobs/{job_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == job_id
    assert "status" in data
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.asyncio
async def test_ocr_get_job_not_found(client: AsyncClient):
    """Test getting a non-existent OCR job."""
    response = await client.get("/api/ocr/jobs/non-existent-job-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_ocr_scan_missing_image(client: AsyncClient):
    """Test OCR scan without image data."""
    response = await client.post(
        "/api/ocr/scan",
        json={},
    )
    # Should accept empty request and potentially return error or handle gracefully
    # The actual behavior depends on the API implementation
    assert response.status_code in [200, 400, 422]
