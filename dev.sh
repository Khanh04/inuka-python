#!/bin/bash

# Docker Compose development environment helper script

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_info "Creating .env file from .env.example..."
        cp .env.example .env
        print_success "Created .env file. Please update it with your configuration."
    else
        print_success ".env file exists"
    fi
}

case "$1" in
    start|up)
        print_info "Starting development environment..."
        check_docker
        check_env
        docker-compose up -d
        print_success "Environment started!"
        echo ""
        print_info "Services available at:"
        echo "  - Backend API: http://localhost:8080"
        echo "  - API Docs: http://localhost:8080/docs"
        echo "  - Frontend: http://localhost:5173"
        echo ""
        print_info "View logs with: ./dev.sh logs"
        ;;

    stop|down)
        print_info "Stopping development environment..."
        docker-compose down
        print_success "Environment stopped"
        ;;

    restart)
        print_info "Restarting development environment..."
        docker-compose restart
        print_success "Environment restarted"
        ;;

    logs)
        if [ -z "$2" ]; then
            docker-compose logs -f
        else
            docker-compose logs -f "$2"
        fi
        ;;

    build)
        print_info "Building containers..."
        docker-compose build
        print_success "Build complete"
        ;;

    rebuild)
        print_info "Rebuilding and restarting containers..."
        docker-compose up -d --build
        print_success "Rebuild complete"
        ;;

    clean)
        print_info "Stopping and removing containers, networks, and volumes..."
        docker-compose down -v
        print_success "Cleanup complete"
        ;;

    shell)
        SERVICE="${2:-backend}"
        print_info "Opening shell in $SERVICE container..."
        if [ "$SERVICE" = "backend" ]; then
            docker-compose exec backend bash
        elif [ "$SERVICE" = "frontend" ]; then
            docker-compose exec frontend sh
        elif [ "$SERVICE" = "postgres" ]; then
            docker-compose exec postgres psql -U inuka -d inuka_template_db
        else
            docker-compose exec "$SERVICE" sh
        fi
        ;;

    migrate)
        print_info "Running database migrations..."
        docker-compose exec backend alembic upgrade head
        print_success "Migrations complete"
        ;;

    test)
        print_info "Running tests..."
        docker-compose exec backend pytest "${@:2}"
        ;;

    ps|status)
        docker-compose ps
        ;;

    help|*)
        echo "Inuka Development Environment Helper"
        echo ""
        echo "Usage: ./dev.sh [command]"
        echo ""
        echo "Commands:"
        echo "  start, up       Start the development environment"
        echo "  stop, down      Stop the development environment"
        echo "  restart         Restart all services"
        echo "  logs [service]  View logs (all services or specific service)"
        echo "  build           Build containers without starting"
        echo "  rebuild         Rebuild and restart containers"
        echo "  clean           Stop and remove all containers, networks, and volumes"
        echo "  shell [service] Open shell in container (backend|frontend|postgres)"
        echo "  migrate         Run database migrations"
        echo "  test [args]     Run tests (pass additional pytest arguments)"
        echo "  ps, status      Show running containers"
        echo "  help            Show this help message"
        echo ""
        echo "Examples:"
        echo "  ./dev.sh start              # Start all services"
        echo "  ./dev.sh logs backend       # View backend logs"
        echo "  ./dev.sh shell backend      # Open bash in backend container"
        echo "  ./dev.sh test tests/        # Run all tests"
        echo "  ./dev.sh test tests/test_forms.py  # Run specific test file"
        ;;
esac
