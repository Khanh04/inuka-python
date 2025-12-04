# Docker Development Environment

This guide explains how to set up and use the Docker-based development environment for the Inuka project.

## Prerequisites

- Docker Desktop (macOS/Windows) or Docker Engine (Linux)
- Docker Compose V2 (comes with Docker Desktop)

## Quick Start

1. **Start all services:**
   ```bash
   docker-compose up
   ```

2. **Start in detached mode (background):**
   ```bash
   docker-compose up -d
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f
   # Or for a specific service:
   docker-compose logs -f backend
   ```

4. **Stop all services:**
   ```bash
   docker-compose down
   ```

## Services

The development environment includes three services:

- **postgres** (port 5432): PostgreSQL database
- **backend** (port 8080): FastAPI Python backend with hot-reload
- **frontend** (port 5173): Vite React frontend with hot-reload

## Access URLs

- Backend API: http://localhost:8080
- API Documentation: http://localhost:8080/docs
- Frontend: http://localhost:5173

## Development Workflow

### Hot Reloading

Both frontend and backend support hot reloading:
- **Backend**: Uvicorn watches Python files in `/app` directory
- **Frontend**: Vite watches files in `/client/src` directory

Simply edit your files and changes will be reflected automatically.

### Running Database Migrations

Migrations run automatically on backend startup. To run manually:

```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Create a new migration
docker-compose exec backend alembic revision --autogenerate -m "Your migration message"

# Rollback last migration
docker-compose exec backend alembic downgrade -1
```

### Running Tests

```bash
# Run all tests
docker-compose exec backend pytest

# Run specific test file
docker-compose exec backend pytest tests/test_forms.py

# Run with coverage
docker-compose exec backend pytest --cov=app tests/
```

### Installing New Dependencies

**Backend:**
```bash
# Add package to requirements.txt, then:
docker-compose exec backend pip install -r requirements.txt
# Or rebuild:
docker-compose up -d --build backend
```

**Frontend:**
```bash
# Add package to package.json, then:
docker-compose exec frontend npm install
# Or rebuild:
docker-compose up -d --build frontend
```

### Database Management

**Access PostgreSQL shell:**
```bash
docker-compose exec postgres psql -U inuka -d inuka_template_db
```

**Reset database:**
```bash
docker-compose down -v  # Removes volumes
docker-compose up -d
```

**Backup database:**
```bash
docker-compose exec postgres pg_dump -U inuka inuka_template_db > backup.sql
```

**Restore database:**
```bash
cat backup.sql | docker-compose exec -T postgres psql -U inuka inuka_template_db
```

## Common Commands

```bash
# Rebuild all services
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build backend

# View service logs
docker-compose logs -f backend

# Execute command in running container
docker-compose exec backend bash
docker-compose exec frontend sh

# Stop and remove containers, networks
docker-compose down

# Stop and remove containers, networks, and volumes
docker-compose down -v

# List running containers
docker-compose ps

# Restart a service
docker-compose restart backend
```

## Troubleshooting

### Port Already in Use
If you get a "port already in use" error:
```bash
# Check what's using the port
lsof -i :8080  # or :5173, :5432
# Kill the process or stop the conflicting service
```

### Database Connection Issues
```bash
# Check if postgres is healthy
docker-compose ps
# View postgres logs
docker-compose logs postgres
# Restart postgres
docker-compose restart postgres
```

### Backend Won't Start
```bash
# Check logs
docker-compose logs backend
# Rebuild backend
docker-compose up -d --build backend
# Access container shell to debug
docker-compose exec backend bash
```

### Frontend Build Issues
```bash
# Clear node_modules and reinstall
docker-compose down frontend
docker-compose up -d --build frontend
```

## Environment Variables

Copy `.env.example` to `.env` for local configuration:
```bash
cp .env.example .env
```

The Docker Compose setup uses environment variables defined in the `docker-compose.yml` file. You can override them by:
1. Creating a `.env` file (not tracked in git)
2. Setting environment variables in your shell
3. Modifying `docker-compose.yml` directly (not recommended for secrets)

## Production Deployment

This Docker Compose setup is for **development only**. For production:
- Use the existing `Dockerfile` (multi-stage build)
- Deploy to Railway, Heroku, or your preferred platform
- Use managed database services
- Set appropriate environment variables
- Enable HTTPS/SSL
- Configure proper security measures

## Clean Up

To completely remove all containers, networks, and volumes:
```bash
docker-compose down -v
docker system prune -a  # Optional: clean up unused Docker resources
```
