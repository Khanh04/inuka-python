#!/usr/bin/env python3
"""Startup script for Railway deployment."""
# Import and run uvicorn directly
import os
import sys

import uvicorn

# Get PORT from environment, default to 8080
port = os.getenv("PORT", "8080")

# Ensure port is a valid integer
try:
    port = str(int(port))
except (ValueError, TypeError):
    print(f"Warning: Invalid PORT value '{port}', defaulting to 8080", file=sys.stderr)
    port = "8080"

print(f"Starting uvicorn on port {port}...", file=sys.stderr)
print(f"Environment PORT variable: {os.getenv('PORT', 'NOT SET')}", file=sys.stderr)


uvicorn.run("app.main:app", host="0.0.0.0", port=int(port))
