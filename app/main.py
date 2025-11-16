"""Main application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import engine, Base
from app.core.config import get_settings
from app.api.v1 import ocr, templates, files, forms, documents

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup: Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: Dispose engine
    await engine.dispose()


# Create FastAPI app
app = FastAPI(
    title="INUKA Template Planner API",
    description="OCR service with template creation system",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint (public)
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# Include routers
app.include_router(ocr.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(forms.router, prefix="/api")
app.include_router(documents.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
    )
