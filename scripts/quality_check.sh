#!/bin/bash

###############################################################################
# Code Quality Check Script
# Runs all quality checks: formatting, linting, type checking, and security
###############################################################################

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="app"
AUTO_FIX=${AUTO_FIX:-false}
AUTO_COMMIT=${AUTO_COMMIT:-false}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔍 Running Code Quality Checks${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print step header
print_step() {
    echo -e "\n${BLUE}➜ $1${NC}"
    echo "----------------------------------------"
}

# Function to handle errors
handle_error() {
    echo -e "${RED}✗ $1 failed${NC}"
    if [ "$AUTO_FIX" = false ]; then
        echo -e "${YELLOW}💡 Tip: Run with AUTO_FIX=true to automatically fix issues${NC}"
        exit 1
    fi
}

# Function to handle success
handle_success() {
    echo -e "${GREEN}✓ $1 passed${NC}"
}

###############################################################################
# Step 1: Black - Code Formatting
###############################################################################
print_step "Black - Code Formatting"

if [ "$AUTO_FIX" = true ]; then
    if black $APP_DIR --config pyproject.toml; then
        handle_success "Black formatting"
    else
        handle_error "Black formatting"
    fi
else
    if black $APP_DIR --check --config pyproject.toml; then
        handle_success "Black formatting"
    else
        echo -e "${RED}✗ Black formatting issues found${NC}"
        echo -e "${YELLOW}Run: black app/ --config pyproject.toml${NC}"
        handle_error "Black formatting"
    fi
fi

###############################################################################
# Step 2: isort - Import Sorting
###############################################################################
print_step "isort - Import Sorting"

if [ "$AUTO_FIX" = true ]; then
    if isort $APP_DIR --profile black --line-length 120; then
        handle_success "isort"
    else
        handle_error "isort"
    fi
else
    if isort $APP_DIR --check-only --profile black --line-length 120; then
        handle_success "isort"
    else
        echo -e "${RED}✗ Import sorting issues found${NC}"
        echo -e "${YELLOW}Run: isort app/ --profile black --line-length 120${NC}"
        handle_error "isort"
    fi
fi

###############################################################################
# Step 3: Pylint - Code Linting
###############################################################################
print_step "Pylint - Code Linting"

if pylint $APP_DIR --rcfile=.pylintrc --exit-zero; then
    handle_success "Pylint"
else
    # Pylint with --exit-zero should never fail, but just in case
    handle_error "Pylint"
fi

###############################################################################
# Step 4: Mypy - Type Checking
###############################################################################
print_step "Mypy - Type Checking"

if mypy $APP_DIR --config-file=mypy.ini; then
    handle_success "Mypy type checking"
else
    echo -e "${YELLOW}⚠ Type checking issues found (non-blocking)${NC}"
fi

###############################################################################
# Step 5: Bandit - Security Scanning
###############################################################################
print_step "Bandit - Security Scanning"

if bandit -r $APP_DIR -c pyproject.toml -f screen; then
    handle_success "Bandit security scan"
else
    echo -e "${YELLOW}⚠ Security issues found (non-blocking)${NC}"
fi

###############################################################################
# Step 6: Auto-commit (if enabled and fixes were applied)
###############################################################################
if [ "$AUTO_FIX" = true ] && [ "$AUTO_COMMIT" = true ]; then
    print_step "Auto-commit Changes"

    # Check if there are any changes to commit
    if [[ -n $(git status -s) ]]; then
        echo -e "${YELLOW}📝 Committing code quality fixes...${NC}"

        git add -A
        git commit -m "$(cat <<'EOF'
chore: apply code quality fixes

- Black formatting applied
- Import sorting with isort
- Code quality improvements

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

        handle_success "Auto-commit"
        echo -e "${GREEN}✓ Changes committed successfully${NC}"
    else
        echo -e "${GREEN}✓ No changes to commit${NC}"
    fi
fi

###############################################################################
# Summary
###############################################################################
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All quality checks completed!${NC}"
echo -e "${BLUE}========================================${NC}"

if [ "$AUTO_FIX" = false ]; then
    echo -e "\n${YELLOW}💡 To automatically fix issues, run:${NC}"
    echo -e "${YELLOW}   AUTO_FIX=true ./scripts/quality_check.sh${NC}"
fi

if [ "$AUTO_FIX" = true ] && [ "$AUTO_COMMIT" = false ]; then
    echo -e "\n${YELLOW}💡 To automatically commit fixes, run:${NC}"
    echo -e "${YELLOW}   AUTO_FIX=true AUTO_COMMIT=true ./scripts/quality_check.sh${NC}"
fi

echo ""
