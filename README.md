# INUKA Template Planner - Python Backend

Python/FastAPI implementation of the INUKA Template Planner OCR service.

## Features

- **OCR Processing**: Extract text from images using Tesseract OCR
- **Template Management**: Create and manage OCR templates
- **File Management**: Track and process document files
- **Async Processing**: Background OCR job processing
- **REST API**: Comprehensive API with JWT authentication
- **PostgreSQL Support**: Modern async database with SQLAlchemy

## Tech Stack

- **Framework**: FastAPI 0.104+
- **Database**: PostgreSQL (via asyncpg) or SQLite
- **OCR**: Tesseract OCR (pytesseract)
- **Image Processing**: OpenCV (opencv-python)
- **ORM**: SQLAlchemy 2.0 (async)
- **Authentication**: JWT (python-jose)
- **Python**: 3.10+

## Quick Start

### Prerequisites

- Python 3.10+
- PostgreSQL (or SQLite for development)
- Tesseract OCR installed

### Installation

1. **Clone and setup virtual environment**:
```bash
cd inuka-python-backend
pyenv virtualenv 3.10.13 inuka-backend
pyenv local inuka-backend
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your database credentials and settings
```

4. **Run the application**:
```bash
python app/main.py
```

The API will be available at `http://localhost:8080`

### Using Docker

```bash
# Build image
docker build -t inuka-python-backend .

# Run container
docker run -p 8080:8080 --env-file .env inuka-python-backend
```

## API Endpoints

### Authentication
All API endpoints (except `/health`) require JWT authentication.
Add header: `Authorization: Bearer <token>`

### OCR
- `POST /api/ocr/scan` - Submit image for OCR processing
- `GET /api/ocr/jobs/{job_id}` - Get OCR job status and results

### Templates
- `GET /api/templates` - List all templates
- `POST /api/templates` - Create new template
- `GET /api/templates/{id}` - Get specific template
- `PATCH /api/templates/{id}` - Update template
- `DELETE /api/templates/{id}` - Delete template

### Files
- `GET /api/files` - List all files
- `POST /api/files` - Create new file
- `GET /api/files/{id}` - Get specific file
- `PATCH /api/files/{id}` - Update file
- `DELETE /api/files/{id}` - Delete file

### Health
- `GET /health` - Health check (public, no auth required)

## API Documentation

Once running, visit:
- **Swagger UI**: `http://localhost:8080/docs`
- **ReDoc**: `http://localhost:8080/redoc`

## Project Structure

```
inuka-python-backend/
├── app/
│   ├── api/
│   │   └── v1/          # API route handlers
│   │       ├── ocr.py
│   │       ├── templates.py
│   │       └── files.py
│   ├── core/            # Core configuration
│   │   ├── config.py
│   │   └── database.py
│   ├── models/          # SQLAlchemy models
│   ├── repositories/    # Database access layer
│   ├── schemas/         # Pydantic request/response models
│   ├── services/        # Business logic
│   │   ├── ocr/
│   │   ├── image_processing/
│   │   └── http_client/
│   ├── middleware/      # Authentication, etc.
│   └── main.py          # Application entry point
├── migrations/          # Database migrations
├── tests/               # Test suite
├── requirements.txt
├── Dockerfile
└── README.md
```

## Configuration

Key environment variables (see `.env.example`):

```bash
# Server
PORT=8080
DEBUG=False

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=inuka
POSTGRES_PASSWORD=your_password
POSTGRES_DB=inuka_template_db

# JWT
JWT_SECRET=change-this-secret-in-production
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# OCR
TESSERACT_PATH=  # Leave empty for system PATH
OCR_LANGUAGES=eng
```

## Development

### Running in development mode

```bash
# Enable debug and auto-reload
export DEBUG=True
python app/main.py
```

### Code formatting

```bash
black app/
```

### Type checking

```bash
mypy app/
```

### Running tests

```bash
pytest
```

## Comparison with Go Backend

This Python implementation provides the same core functionality as the Go version:

| Feature | Go Backend | Python Backend |
|---------|-----------|----------------|
| Web Framework | Echo | FastAPI |
| Database | MySQL + SQLite | PostgreSQL + SQLite |
| ORM | Manual SQL | SQLAlchemy |
| OCR | gosseract | pytesseract |
| Image Processing | GoCV | OpenCV-Python |
| Async | Goroutines | asyncio |
| Auth | golang-jwt | python-jose |
| API Docs | Manual/Postman | Auto-generated (OpenAPI) |

### Key Differences

1. **Auto-generated docs**: FastAPI provides Swagger UI out of the box
2. **Type safety**: Pydantic provides runtime validation
3. **Database**: Uses PostgreSQL instead of MySQL (more features)
4. **Simplified**: No multi-tenancy in MVP (can be added later)

## License

MIT
