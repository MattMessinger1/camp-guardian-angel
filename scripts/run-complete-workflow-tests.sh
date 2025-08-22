#!/bin/bash

# Complete Workflow Test Suite
# Tests the actual 6-step workflow with existing test files

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🎯 Complete 6-Step Workflow Test Suite${NC}"
echo ""

# Track test results
TOTAL_TESTS=5
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${YELLOW}Testing: $test_name${NC}"
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        ((FAILED_TESTS++))
    fi
    echo ""
}

# 1. Basic Smoke Test (Homepage)
run_test "Step 1: Homepage Loads" "npx playwright test tests/smoke.spec.ts --reporter=line"

# 2. Basic MVP Workflow (Steps 1-5)
run_test "Steps 1-5: Basic Workflow" "npx playwright test tests/mvp-workflow.spec.ts --reporter=line"

# 3. Account History (Step 6)
run_test "Step 6: Account History" "npx playwright test tests/account-history.spec.ts --reporter=line"

# 4. Readiness Workflow (Detailed)
run_test "Readiness Workflow (Detailed)" "npx playwright test tests/readiness-workflow.spec.ts --reporter=line"

# 5. Integration Tests (All 6 Categories)
run_test "Integration Tests (TC-031 to TC-036)" "npx playwright test tests/ready-to-signup-integration.spec.ts --reporter=line"

# Summary
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo -e "Total Test Suites: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Workflow is working correctly.${NC}"
else
    echo -e "${RED}⚠️  Some tests failed. Issues to fix:${NC}"
fi

echo ""
echo -e "${BLUE}📝 6-Step Workflow URLs:${NC}"
echo "Step 1: Search (/ or /find-camps)"
echo "Step 2: Get Ready for Signup (/signup?sessionId=\${sessionId})"
echo "Step 3: Complete Your Signup (same page)"
echo "Step 4: Ready for Signup Status (/sessions/\${sessionId}/ready-to-signup)"
echo "Step 5: Pending Signups (/sessions/\${sessionId}/confirmation)"
echo "Step 6: Account History (/account/history)"

echo ""
echo -e "${GREEN}🚀 Testing complete. Review results above.${NC}"