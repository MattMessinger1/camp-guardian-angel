#!/bin/bash

# Complete Ready for Signup Test Suite  
# Tests all 8 categories of the readiness system

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🎯 Complete Ready for Signup Test Suite${NC}"
echo -e "${BLUE}Running all 8 test categories...${NC}"
echo ""

# Track test results
TOTAL_TESTS=8
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

# 1. Session Discovery & Search
run_test "Session Discovery & Search" "npx playwright test tests/ready-to-signup-session-discovery.spec.ts --reporter=line"

# 2. Payment Pre-Authorization Flow  
run_test "Payment Pre-Authorization Flow" "npx playwright test tests/ready-to-signup-payment-flow.spec.ts --reporter=line"

# 3. Information Gathering
run_test "Information Gathering" "npx playwright test tests/ready-to-signup-information-gathering.spec.ts --reporter=line"

# 4. Edge Cases & Error Handling
run_test "Edge Cases & Error Handling" "npx playwright test tests/ready-to-signup-edge-cases.spec.ts --reporter=line"

# 5. Integration Tests (newly enabled)
run_test "Integration Tests" "npx playwright test tests/ready-to-signup-integration.spec.ts --reporter=line"

# 6. Readiness Workflow
run_test "Readiness Workflow" "npx playwright test tests/readiness-workflow.spec.ts --reporter=line"

# 7. Unit Tests - Readiness Functionality  
run_test "Unit Tests - Readiness Functions" "npx playwright test tests/unit/readiness-functionality.test.ts --reporter=line"

# 8. Unit Tests - Edge Functions
run_test "Unit Tests - Edge Functions" "npx playwright test tests/unit/readiness-edge-functions.test.ts --reporter=line"

# Summary
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Ready for Signup system is working correctly.${NC}"
else
    echo -e "${RED}⚠️  Some tests failed. Check the output above for details.${NC}"
fi

echo ""
echo -e "${BLUE}📝 Manual Testing Checklist:${NC}"
echo "1. Navigate to /readiness - should show landing page"
echo "2. Click 'Browse Sessions' - should go to /sessions"
echo "3. Find a session and click 'Ready for Signup'"
echo "4. Test AI readiness assessment"
echo "5. Verify payment pre-authorization"
echo "6. Test requirement research flow"
echo "7. Check preparation guide completeness"
echo "8. Test mobile responsiveness"

echo ""
echo -e "${GREEN}🚀 Testing complete. Review results above.${NC}"