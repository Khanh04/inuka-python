#!/bin/bash

###############################################################################
# Pre-commit Hooks Setup Script
# Installs and configures pre-commit hooks for automated quality checks
###############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔧 Setting up pre-commit hooks${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if pre-commit is installed
if ! command -v pre-commit &> /dev/null; then
    echo -e "${YELLOW}⚠ pre-commit not found, installing...${NC}"
    pip install pre-commit
fi

# Install the git hooks
echo -e "${BLUE}➜ Installing pre-commit hooks...${NC}"
pre-commit install

# Run hooks on all files to verify setup
echo -e "\n${BLUE}➜ Running hooks on all files (initial check)...${NC}"
pre-commit run --all-files || true

echo ""
echo -e "${GREEN}✓ Pre-commit hooks installed successfully!${NC}"
echo ""
echo -e "${YELLOW}ℹ️  Hooks will now run automatically on:${NC}"
echo -e "   - git commit (pre-commit hooks)"
echo -e ""
echo -e "${YELLOW}ℹ️  To manually run hooks:${NC}"
echo -e "   pre-commit run --all-files${NC}"
echo -e ""
echo -e "${YELLOW}ℹ️  To skip hooks (not recommended):${NC}"
echo -e "   git commit --no-verify${NC}"
echo ""
