#!/usr/bin/env python3
"""
Test script for OCR/Tesseract endpoint
Usage: python test_ocr.py [image_path]
"""

import sys
import time
import base64
import requests
import json
from pathlib import Path
from typing import Optional

# Configuration
BASE_URL = "http://localhost:8080"
JWT_SECRET = "change-this-secret-in-production-environment"  # Match your .env
DEFAULT_IMAGE = "client/public/placeholder.png"


def generate_test_token(secret: str = JWT_SECRET) -> str:
    """Generate a test JWT token."""
    try:
        import jwt
        payload = {
            "sub": "test_user",
            "username": "test_user",
            "exp": int(time.time()) + 3600  # Valid for 1 hour
        }
        token = jwt.encode(payload, secret, algorithm="HS256")
        return token
    except ImportError:
        print("⚠ PyJWT not installed. Install it with: pip install pyjwt")
        return None


def encode_image_to_base64(image_path: str) -> str:
    """Convert image file to base64 string."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


def submit_ocr_job(image_base64: str, token: Optional[str] = None, language: str = "eng") -> dict:
    """Submit an OCR job."""
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    payload = {
        "image_base64": image_base64,
        "language": language
    }

    response = requests.post(
        f"{BASE_URL}/api/ocr/scan",
        headers=headers,
        json=payload
    )

    return {
        "status_code": response.status_code,
        "data": response.json() if response.ok else response.text
    }


def get_job_status(job_id: str, token: Optional[str] = None) -> dict:
    """Get OCR job status."""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    response = requests.get(
        f"{BASE_URL}/api/ocr/jobs/{job_id}",
        headers=headers
    )

    return {
        "status_code": response.status_code,
        "data": response.json() if response.ok else response.text
    }


def poll_for_results(job_id: str, token: Optional[str] = None, max_attempts: int = 30) -> dict:
    """Poll for OCR results."""
    for attempt in range(1, max_attempts + 1):
        print(f"  Polling attempt {attempt}/{max_attempts}...", end="\r")

        result = get_job_status(job_id, token)

        if result["status_code"] != 200:
            return result

        status = result["data"].get("status")

        if status == "COMPLETED":
            print()  # New line after polling
            return result
        elif status == "FAILED":
            print()  # New line after polling
            return result

        time.sleep(1)

    print()  # New line after polling
    return {"status_code": 408, "data": {"error": "Timeout waiting for results"}}


def main():
    # Get image path from command line or use default
    image_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_IMAGE

    print("=" * 60)
    print("Testing OCR/Tesseract Endpoint")
    print("=" * 60)
    print()

    # Check if image exists
    if not Path(image_path).exists():
        print(f"❌ Error: Image file not found: {image_path}")
        print(f"Usage: {sys.argv[0]} [image_path]")
        sys.exit(1)

    print(f"📁 Using image: {image_path}")
    print()

    # Step 1: Generate JWT token
    print("🔑 Step 1: Generating JWT token...")
    token = generate_test_token()
    if token:
        print(f"✓ Token generated: {token[:20]}...")
    else:
        print("⚠ No token generated (testing without auth)")
    print()

    # Step 2: Encode image
    print("🖼️  Step 2: Encoding image to base64...")
    try:
        image_base64 = encode_image_to_base64(image_path)
        print(f"✓ Image encoded ({len(image_base64)} bytes)")
    except Exception as e:
        print(f"❌ Error encoding image: {e}")
        sys.exit(1)
    print()

    # Step 3: Submit OCR job
    print("📤 Step 3: Submitting OCR job...")
    result = submit_ocr_job(image_base64, token)

    print(f"Status Code: {result['status_code']}")
    print(f"Response: {json.dumps(result['data'], indent=2)}")
    print()

    if result["status_code"] != 200:
        print("❌ Failed to submit OCR job")
        if result["status_code"] in [401, 403]:
            print("⚠ Authentication error. Make sure JWT_SECRET matches your .env file")
        sys.exit(1)

    job_id = result["data"].get("job_id")
    if not job_id:
        print("❌ No job_id in response")
        sys.exit(1)

    print(f"✓ OCR job created: {job_id}")
    print()

    # Step 4: Poll for results
    print("⏳ Step 4: Waiting for OCR processing...")
    final_result = poll_for_results(job_id, token)

    print(f"Status Code: {final_result['status_code']}")
    print()

    if final_result["status_code"] == 200:
        data = final_result["data"]
        status = data.get("status")

        if status == "COMPLETED":
            print("✅ OCR Processing Completed!")
            print()
            print("-" * 60)
            print("Extracted Text:")
            print("-" * 60)
            print(data.get("result_text", "No text found"))
            print("-" * 60)
        elif status == "FAILED":
            print("❌ OCR Processing Failed")
            print(f"Error: {data.get('error_message', 'Unknown error')}")
        else:
            print(f"⚠ Job status: {status}")
    else:
        print(f"❌ Error getting results: {final_result['data']}")

    print()
    print("=" * 60)
    print("Test Complete")
    print("=" * 60)
    print()
    print("💡 Tips:")
    print(f"  - Swagger UI: {BASE_URL}/docs")
    print("  - Check Tesseract: tesseract --version")
    print("  - Try different images: python test_ocr.py path/to/image.png")


if __name__ == "__main__":
    main()
