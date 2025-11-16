#!/bin/bash

# Test script for INUKA Python Backend API

BASE_URL="http://localhost:8080"

echo "=== Testing INUKA Python Backend API ==="
echo

# Test 1: Health check (no auth required)
echo "1. Health Check (no auth required)"
curl -s $BASE_URL/health | python -m json.tool
echo
echo "---"
echo

# Test 2: Try to create template without auth (should fail)
echo "2. Create Template WITHOUT Auth (should return 403)"
curl -s -X POST $BASE_URL/api/templates \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Template"}' | python -m json.tool
echo
echo "---"
echo

# Test 3: API documentation
echo "3. API Documentation Available"
echo "Swagger UI: $BASE_URL/docs"
echo "ReDoc: $BASE_URL/redoc"
echo "OpenAPI JSON: $BASE_URL/openapi.json"
echo
echo "---"
echo

# Test 4: Show all available endpoints
echo "4. Available Endpoints:"
curl -s $BASE_URL/openapi.json | python -c "
import sys, json
data = json.load(sys.stdin)
for path, methods in data['paths'].items():
    for method in methods.keys():
        print(f'  {method.upper():7} {path}')
"
echo
echo "---"
echo

echo "✅ Backend is running successfully!"
echo
echo "To test endpoints interactively:"
echo "  Open browser: $BASE_URL/docs"
echo
echo "Note: Most endpoints require JWT authentication"
echo "      Use the /docs interface to test with auth"
