#!/bin/bash

# Script to run Playwright tests without vitest conflicts
# Uses built version of app instead of dev server

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔧 Testing Playwright without vitest conflicts${NC}"
echo ""

# Step 1: Test without any server (should fail but show no vitest error)
echo -e "${YELLOW}Step 1: Testing without server (expect connection failure)${NC}"
echo "Running: npx playwright test --config=playwright.config.no-server.js --reporter=line tests/basic-test.spec.ts"
npx playwright test --config=playwright.config.no-server.js --reporter=line tests/basic-test.spec.ts || echo -e "${YELLOW}Expected failure - no server running${NC}"
echo ""

# Step 2: Build the app
echo -e "${YELLOW}Step 2: Building the app${NC}"
npm run build
echo ""

# Step 3: Start preview server in background
echo -e "${YELLOW}Step 3: Starting preview server on port 8080${NC}"
npx vite preview --port 8080 &
PREVIEW_PID=$!

# Trap to cleanup preview server on exit
trap "kill $PREVIEW_PID 2>/dev/null || true" EXIT

# Wait for server to start
echo "Waiting for preview server to start..."
sleep 5

# Step 4: Test with built app
echo -e "${YELLOW}Step 4: Testing with built app (should work without vitest conflicts)${NC}"
echo "Running: npx playwright test --config=playwright.config.no-server.js --reporter=line tests/basic-test.spec.ts"

if npx playwright test --config=playwright.config.no-server.js --reporter=line tests/basic-test.spec.ts; then
    echo -e "${GREEN}✅ SUCCESS: Playwright works with built app!${NC}"
    echo -e "${GREEN}✅ The issue is confirmed to be dev server loading vitest${NC}"
else
    echo -e "${RED}❌ Test failed even with built app${NC}"
fi

echo ""
echo -e "${BLUE}🎯 Next Steps:${NC}"
echo "1. If tests passed, the issue is dev server loading vitest"
echo "2. Solution: Use built app for E2E tests instead of dev server"
echo "3. Or configure Vite to exclude vitest in dev mode"

# Cleanup happens automatically via trap