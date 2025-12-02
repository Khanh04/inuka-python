#!/usr/bin/env python3
"""Startup script for Railway deployment."""
# Import and run uvicorn directly
import os
import subprocess
import sys

import uvicorn

# Run Alembic migrations before starting the server
print("Running database migrations...", file=sys.stderr)
try:
    result = subprocess.run(["alembic", "upgrade", "head"], check=True, capture_output=True, text=True)
    print("Migrations completed successfully!", file=sys.stderr)
    if result.stdout:
        print(result.stdout, file=sys.stderr)
except subprocess.CalledProcessError as e:
    print(f"Migration failed: {e}", file=sys.stderr)
    if e.stdout:
        print(f"STDOUT: {e.stdout}", file=sys.stderr)
    if e.stderr:
        print(f"STDERR: {e.stderr}", file=sys.stderr)
    print("Continuing with server startup despite migration failure...", file=sys.stderr)
except Exception as e:
    print(f"Unexpected error during migration: {e}", file=sys.stderr)
    print("Continuing with server startup...", file=sys.stderr)

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
