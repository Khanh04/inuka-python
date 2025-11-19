#!/usr/bin/env python3
"""Startup script for Railway deployment."""
import os
import subprocess
import sys

# Get PORT from environment, default to 8080
port = os.getenv("PORT", "8080")

print(f"Starting uvicorn on port {port}...", file=sys.stderr)

# Start uvicorn with the port
subprocess.run([
    "python", "-m", "uvicorn",
    "app.main:app",
    "--host", "0.0.0.0",
    "--port", port
])
