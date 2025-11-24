FROM python:3.10-slim AS backend-builder

# Install system dependencies for Tesseract, OpenCV, and PDF processing
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    libtesseract-dev \
    libleptonica-dev \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Frontend build stage
FROM node:18-slim AS frontend-builder

WORKDIR /app/client

# Copy frontend package files
COPY client/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY client/ ./
RUN npm run build

# Final stage
FROM python:3.10-slim

# Install runtime dependencies for Tesseract, OpenCV, and PDF processing
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    libtesseract-dev \
    libleptonica-dev \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python dependencies from backend-builder
COPY --from=backend-builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin

# Copy application code
COPY app/ ./app/
COPY requirements.txt .
COPY start.py .

# Copy built frontend from frontend-builder
COPY --from=frontend-builder /app/client/dist ./client/dist

# Expose port (Railway will use $PORT environment variable)
EXPOSE 8080

# Run the application using Python startup script
# Railway sets PORT automatically, script will use it
CMD ["python", "start.py"]
