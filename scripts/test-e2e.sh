#!/bin/bash

# Permanent E2E Testing Script - Zero Vitest Conflicts
# This script ensures complete isolation between Vitest and Playwright

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔒 Starting E2E Tests with Complete Vitest Isolation${NC}"
echo ""

# Step 1: Clear any vitest-related environment variables
echo -e "${YELLOW}Step 1: Clearing Vitest environment...${NC}"
unset VITEST
unset JEST_WORKER_ID
unset NODE_OPTIONS

# Step 2: Set E2E-specific environment
echo -e "${YELLOW}Step 2: Setting E2E environment...${NC}"
export NODE_ENV=e2e
export VITEST=false
export JEST_WORKER_ID=""
export NODE_OPTIONS=""

# Step 3: Clear any cached modules
echo -e "${YELLOW}Step 3: Clearing module cache...${NC}"
rm -rf node_modules/.vite/ 2>/dev/null || true
rm -rf node_modules/.cache/ 2>/dev/null || true

# Step 4: Run E2E tests
echo -e "${YELLOW}Step 4: Running E2E tests...${NC}"
echo "Environment: NODE_ENV=$NODE_ENV, VITEST=$VITEST"
echo ""

if [ "$1" = "--ui" ]; then
    npx playwright test --ui "$@"
elif [ "$1" = "--headed" ]; then
    npx playwright test --headed --reporter=line "${@:2}"
else
    npx playwright test --reporter=line "$@"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ SUCCESS: E2E tests completed without conflicts!${NC}"
else
    echo ""
    echo -e "${RED}❌ E2E tests failed - check output above${NC}"
    exit 1
fi