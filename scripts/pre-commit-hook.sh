#!/bin/bash

# Pre-commit Infrastructure Health Check
# Prevents commits when infrastructure is broken
# 
# Installation:
#   cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit

set -e

# Color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

echo -e "${YELLOW}Running pre-commit infrastructure health check...${NC}"

# Check if infrastructure is healthy
if ! ./scripts/infrastructure-health-monitor.sh check >/dev/null 2>&1; then
    echo -e "${RED}❌ Infrastructure health check failed!${NC}"
    echo -e "${RED}Cannot commit with broken infrastructure.${NC}"
    echo ""
    echo -e "${YELLOW}To fix this issue:${NC}"
    echo "1. Run: npm run infrastructure:recover"
    echo "2. Or run: ./scripts/infrastructure-health-monitor.sh"
    echo "3. Try committing again after recovery"
    echo ""
    echo -e "${YELLOW}For detailed diagnosis:${NC}"
    echo "  Run: npm run infrastructure:check"
    exit 1
fi

echo -e "${GREEN}✅ Infrastructure health check passed${NC}"
exit 0