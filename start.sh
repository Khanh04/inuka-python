#!/bin/bash
# Startup script for Railway deployment

# Get PORT from environment, default to 8080
PORT=${PORT:-8080}

# Start uvicorn with the port
python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
