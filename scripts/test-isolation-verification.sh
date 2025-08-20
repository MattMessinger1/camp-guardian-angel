#!/bin/bash

# Verification script to test different isolation levels
# Helps identify which approach eliminates the symbol conflict

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🧪 Testing Playwright Isolation Levels${NC}"
echo ""

# Test 1: Minimal test with original config (should fail)
echo -e "${YELLOW}Test 1: Original config (expect Symbol error)${NC}"
echo "Running: npx playwright test tests/basic-test.spec.ts --reporter=line"
if npx playwright test tests/basic-test.spec.ts --reporter=line 2>&1 | grep -q "Cannot redefine property: Symbol"; then
    echo -e "${RED}❌ Expected failure: Symbol conflict present${NC}"
else
    echo -e "${YELLOW}⚠️  Unexpected: No symbol conflict with original config${NC}"
fi
echo ""

# Test 2: Clean isolated config
echo -e "${YELLOW}Test 2: Clean isolated config${NC}"
echo "Running: npx playwright test tests/basic-test.spec.ts --config=playwright.config.isolated.ts --reporter=line"
if npx playwright test tests/basic-test.spec.ts --config=playwright.config.isolated.ts --reporter=line; then
    echo -e "${GREEN}✅ SUCCESS: Isolated config works!${NC}"
else
    echo -e "${RED}❌ Isolated config still has issues${NC}"
fi
echo ""

# Test 3: Complete process isolation
echo -e "${YELLOW}Test 3: Complete process isolation with module loader${NC}"
echo "Running: bash scripts/run-playwright-isolated.sh tests/basic-test.spec.ts"
if bash scripts/run-playwright-isolated.sh tests/basic-test.spec.ts; then
    echo -e "${GREEN}✅ SUCCESS: Complete isolation works!${NC}"
else
    echo -e "${RED}❌ Complete isolation still has issues${NC}"
fi

echo ""
echo -e "${BLUE}🎯 Isolation Test Results:${NC}"
echo "1. Original config should show Symbol error"
echo "2. Isolated config should work better"  
echo "3. Complete process isolation should eliminate all conflicts"
echo ""
echo -e "${GREEN}Use: bash scripts/run-playwright-isolated.sh${NC} for clean test execution"