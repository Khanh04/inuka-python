"""Main application entry point."""
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

# Serve static frontend files (if they exist)
frontend_dist = Path(__file__).parent.parent / "client" / "dist"
if frontend_dist.exists():
    # Mount static assets directory for Vite built assets (JS, CSS, etc.)
    assets_path = frontend_dist / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

    # Serve index.html for the root and all non-API routes (SPA fallback)
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve frontend for all non-API routes."""
        # Don't intercept API routes or health check
        if full_path.startswith(("api/", "health", "docs", "redoc", "openapi.json")):
            return {"message": "Not found"}

        # If requesting a specific file that exists, serve it
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)

        # Otherwise serve index.html (for SPA routing)
        index_path = frontend_dist / "index.html"
        if index_path.exists():
            return FileResponse(index_path)

        return {"message": "Frontend not found"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
    )
