#!/bin/bash

# Progressive testing to verify symbol isolation works at each level

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔬 Progressive Symbol Isolation Testing${NC}"
echo ""

# Function to check for symbol conflicts in output
check_symbol_conflict() {
    local output="$1"
    if echo "$output" | grep -q "Cannot redefine property: Symbol"; then
        return 0  # Conflict found
    else
        return 1  # No conflict
    fi
}

# Test 1: Basic test without expect (should always work)
echo -e "${YELLOW}Test 1: Basic test (no expect import)${NC}"
output1=$(npx playwright test tests/basic-test.spec.ts --config=playwright.config.clean.ts --reporter=line 2>&1)
if check_symbol_conflict "$output1"; then
    echo -e "${RED}❌ UNEXPECTED: Symbol conflict in basic test${NC}"
    echo "$output1"
else
    echo -e "${GREEN}✅ Basic test works (as expected)${NC}"
fi

echo ""

# Test 2: Test that imports expect from Playwright
echo -e "${YELLOW}Test 2: Test with expect import (the real test)${NC}"
output2=$(npx playwright test tests/manual-backup.spec.ts --config=playwright.config.clean.ts --reporter=line 2>&1)
if check_symbol_conflict "$output2"; then
    echo -e "${RED}❌ FAILED: Symbol conflict still present with expect${NC}"
    echo "Output:"
    echo "$output2"
    echo ""
    echo -e "${RED}The static file server approach did not resolve the symbol conflict.${NC}"
    echo -e "${YELLOW}Next steps: Need to investigate alternative solutions${NC}"
else
    echo -e "${GREEN}✅ SUCCESS: Test with expect works! Symbol conflict resolved!${NC}"
    echo ""
    
    # Test 3: Full test suite
    echo -e "${YELLOW}Test 3: Full test suite verification${NC}"
    output3=$(npx playwright test --config=playwright.config.clean.ts --reporter=line 2>&1)
    if check_symbol_conflict "$output3"; then
        echo -e "${RED}❌ Some tests in the full suite still have conflicts${NC}"
        echo "Need to investigate specific test files"
    else
        echo -e "${GREEN}✅ COMPLETE SUCCESS: Full test suite works without conflicts!${NC}"
    fi
fi

echo ""
echo -e "${BLUE}Symbol isolation testing complete.${NC}"