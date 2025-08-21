#!/bin/bash

# Complete symbol isolation for Playwright tests using static file server
# This eliminates ALL Vite/Node module contamination

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🧹 Running Playwright with Complete Symbol Isolation${NC}"
echo -e "${YELLOW}Strategy: Static file server (no Vite, no Node modules)${NC}"
echo ""

# Step 1: Clean environment variables
echo -e "${YELLOW}Step 1: Setting clean environment...${NC}"
export NODE_ENV=playwright-test
export VITEST=false
export JEST_WORKER_ID=
export NODE_OPTIONS="--no-experimental-loader"
unset VITEST_CONFIG
unset JEST_CONFIG

# Step 2: Clear module cache
echo -e "${YELLOW}Step 2: Clearing Node.js module cache...${NC}"
rm -rf node_modules/.cache 2>/dev/null || true

# Step 3: Kill any existing servers on our target port
echo -e "${YELLOW}Step 3: Cleaning up existing servers...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Step 4: Run Playwright with clean static server
echo -e "${YELLOW}Step 4: Starting Playwright with static file server...${NC}"
echo "Config: playwright.config.clean.ts"
echo "Server: npx serve (static files only)"
echo "Port: 3000"
echo ""

npx playwright test --config=playwright.config.clean.ts --reporter=line "$@"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ SUCCESS: Playwright tests completed with complete symbol isolation!${NC}"
else
    echo ""
    echo -e "${RED}❌ Tests failed - check output above${NC}"
    exit 1
fi