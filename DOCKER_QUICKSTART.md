# Quick Start Guide - Docker Development

## First Time Setup

```bash
# 1. Ensure Docker Desktop is running

# 2. Start the development environment
./dev.sh start

# 3. Access the services
# - Backend: http://localhost:8080/docs
# - Frontend: http://localhost:5173
```

## Daily Development

```bash
# Start working
./dev.sh start

# View logs (all services)
./dev.sh logs

# View specific service logs
./dev.sh logs backend
./dev.sh logs frontend

# Stop when done
./dev.sh stop
```

## Common Tasks

### Code Changes
- **Backend**: Edit Python files in `app/` - auto-reloads
- **Frontend**: Edit React files in `client/src/` - auto-reloads

### Database Migrations
```bash
# Create migration after model changes
./dev.sh shell backend
alembic revision --autogenerate -m "Description"
exit

# Apply migrations
./dev.sh migrate
```

### Running Tests
```bash
# All tests
./dev.sh test

# Specific test file
./dev.sh test tests/test_forms.py

# With coverage
./dev.sh shell backend
pytest --cov=app tests/
```

### Installing Packages

**Backend:**
```bash
# Add to requirements.txt, then:
./dev.sh shell backend
pip install -r requirements.txt
# Or rebuild:
./dev.sh rebuild
```

**Frontend:**
```bash
./dev.sh shell frontend
npm install
```

### Database Access
```bash
# PostgreSQL shell
./dev.sh shell postgres

# Or from backend
./dev.sh shell backend
psql postgresql://inuka:inuka_dev_password@postgres:5432/inuka_template_db
```

### Troubleshooting

**Port in use:**
```bash
# Find and kill process using port 8080
lsof -ti:8080 | xargs kill -9

# Or use different port in docker-compose.yml
```

**Start fresh:**
```bash
# Remove everything and start over
./dev.sh clean
./dev.sh start
```

**Container issues:**
```bash
# Check status
./dev.sh ps

# Rebuild specific service
docker-compose up -d --build backend
```

## Full Command Reference

| Command | Description |
|---------|-------------|
| `./dev.sh start` | Start all services |
| `./dev.sh stop` | Stop all services |
| `./dev.sh restart` | Restart services |
| `./dev.sh logs [service]` | View logs |
| `./dev.sh shell [service]` | Open shell |
| `./dev.sh migrate` | Run migrations |
| `./dev.sh test` | Run tests |
| `./dev.sh build` | Build containers |
| `./dev.sh rebuild` | Rebuild & restart |
| `./dev.sh clean` | Remove everything |
| `./dev.sh ps` | Show status |

## Environment Variables

Located in `.env` file (created from `.env.example`):

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=inuka
POSTGRES_PASSWORD=inuka_dev_password
POSTGRES_DB=inuka_template_db

PORT=8080
DEBUG=true

JWT_SECRET=dev-secret-key-change-in-production
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│  PostgreSQL │
│   (Vite)    │     │  (FastAPI)  │     │             │
│  Port 5173  │     │  Port 8080  │     │  Port 5432  │
└─────────────┘     └─────────────┘     └─────────────┘
```

All services communicate through Docker's internal network.
Only exposed ports are accessible from your host machine.
