#!/bin/bash

# Complete process isolation for Playwright tests
# Eliminates all Vitest/Jest symbol conflicts

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔒 Running Playwright with Complete Process Isolation${NC}"
echo ""

# Step 1: Clean environment variables
echo -e "${YELLOW}Step 1: Cleaning environment...${NC}"
unset VITEST
unset JEST_WORKER_ID
export NODE_ENV=playwright-test
export PLAYWRIGHT_ISOLATION=true

# Step 2: Clear any cached modules that might contain Vitest
echo -e "${YELLOW}Step 2: Clearing Node.js module cache...${NC}"
rm -rf node_modules/.cache 2>/dev/null || true

# Step 3: Run Playwright with custom module loader
echo -e "${YELLOW}Step 3: Starting Playwright with module blocking...${NC}"
echo "Config: playwright.config.isolated.ts"
echo "Environment: NODE_ENV=playwright-test"
echo ""

# Use our custom module loader to block Vitest modules
node scripts/playwright-module-loader.js test --config=playwright.config.isolated.ts --reporter=line "$@"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ SUCCESS: Playwright tests completed without symbol conflicts!${NC}"
else
    echo ""
    echo -e "${RED}❌ Tests failed - check output above${NC}"
    exit 1
fi