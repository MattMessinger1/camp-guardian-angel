#!/bin/bash

# Ready to Signup Test Suite Runner
# This script runs all the "Ready to Signup" workflow tests

echo "🚀 Starting Ready to Signup Test Suite..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run test and capture results
run_test_suite() {
    local test_file=$1
    local test_name=$2
    
    echo -e "${BLUE}Running $test_name...${NC}"
    
    if npx playwright test "$test_file" --reporter=line; then
        echo -e "${GREEN}✅ $test_name PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name FAILED${NC}"
        return 1
    fi
}

# Initialize counters
total_suites=0
passed_suites=0
failed_suites=0

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Please install Node.js and npm.${NC}"
    exit 1
fi

# Check if Playwright tests directory exists
if [ ! -d "tests" ]; then
    echo -e "${RED}❌ Tests directory not found. Please run from project root.${NC}"
    exit 1
fi

echo "Setting up test environment..."

# Start development server in background (if needed)
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "Starting development server..."
    npm run dev &
    DEV_SERVER_PID=$!
    
    # Wait for server to start
    echo "Waiting for development server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            echo "✅ Development server is running"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Development server failed to start${NC}"
            exit 1
        fi
    done
else
    echo "✅ Development server already running"
fi

echo ""
echo "======================================"
echo "🧪 RUNNING READY TO SIGNUP TEST SUITES"
echo "======================================"
echo ""

# Test Suite 1: Session Discovery
echo -e "${YELLOW}Test Suite 1: Session Discovery & Search${NC}"
total_suites=$((total_suites + 1))
if run_test_suite "tests/ready-to-signup-session-discovery.spec.ts" "Session Discovery"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

# Test Suite 2: Payment Flow
echo -e "${YELLOW}Test Suite 2: Payment Pre-Authorization${NC}"
total_suites=$((total_suites + 1))
if run_test_suite "tests/ready-to-signup-payment-flow.spec.ts" "Payment Flow"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

# Test Suite 3: Information Gathering
echo -e "${YELLOW}Test Suite 3: Information Gathering${NC}"
total_suites=$((total_suites + 1))
if run_test_suite "tests/ready-to-signup-information-gathering.spec.ts" "Information Gathering"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

# Test Suite 4: Edge Cases
echo -e "${YELLOW}Test Suite 4: Edge Cases & Error Handling${NC}"
total_suites=$((total_suites + 1))
if run_test_suite "tests/ready-to-signup-edge-cases.spec.ts" "Edge Cases"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

# Test Suite 5: Integration Tests
echo -e "${YELLOW}Test Suite 5: Integration Tests${NC}"
total_suites=$((total_suites + 1))
if run_test_suite "tests/ready-to-signup-integration.spec.ts" "Integration Tests"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo ""

# Cleanup: Stop development server if we started it
if [ ! -z "$DEV_SERVER_PID" ]; then
    echo "Stopping development server..."
    kill $DEV_SERVER_PID 2>/dev/null || true
fi

# Final Results
echo "======================================"
echo "🏁 READY TO SIGNUP TEST RESULTS"
echo "======================================"
echo -e "Total Test Suites: $total_suites"
echo -e "${GREEN}Passed: $passed_suites${NC}"
echo -e "${RED}Failed: $failed_suites${NC}"

if [ $failed_suites -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL READY TO SIGNUP TESTS PASSED!${NC}"
    echo -e "${GREEN}Your 'Ready to Signup' workflow is functioning correctly.${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  SOME TESTS FAILED${NC}"
    echo -e "${YELLOW}Please review the failed tests and fix any issues.${NC}"
    echo ""
    echo "Common fixes:"
    echo "1. Ensure development server is running on localhost:5173"
    echo "2. Check database connectivity and test data"
    echo "3. Verify authentication test credentials"
    echo "4. Check Stripe test mode configuration"
    exit 1
fi