#!/bin/bash

# Test All - Comprehensive testing script for the camp registration system
# Usage: ./scripts/test-all.sh [--fast] [--no-build] [--debug]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
FAST_MODE=false
NO_BUILD=false
DEBUG_MODE=false

for arg in "$@"; do
  case $arg in
    --fast)
      FAST_MODE=true
      shift
      ;;
    --no-build)
      NO_BUILD=true
      shift
      ;;
    --debug)
      DEBUG_MODE=true
      shift
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: ./scripts/test-all.sh [--fast] [--no-build] [--debug]"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}🧪 Starting comprehensive test suite...${NC}"
echo -e "${BLUE}Mode: $([ "$FAST_MODE" = true ] && echo "FAST" || echo "FULL")${NC}"
echo ""

# Function to run command with error handling
run_test() {
  local test_name="$1"
  local command="$2"
  local required="$3"
  
  echo -e "${YELLOW}▶️  Running $test_name...${NC}"
  
  if eval "$command"; then
    echo -e "${GREEN}✅ $test_name passed${NC}"
    echo ""
    return 0
  else
    if [ "$required" = "required" ]; then
      echo -e "${RED}❌ $test_name failed (REQUIRED)${NC}"
      echo ""
      exit 1
    else
      echo -e "${YELLOW}⚠️  $test_name failed (OPTIONAL)${NC}"
      echo ""
      return 1
    fi
  fi
}

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper to increment counters
count_test() {
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  if [ $? -eq 0 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# 1. Build the application (unless --no-build)
if [ "$NO_BUILD" = false ]; then
  run_test "Application Build" "npm run build" "required"
  count_test
fi

# 2. Unit Tests (always run)
run_test "Unit Tests" "npm run test:unit" "required"
count_test

# 3. Linting (quick check)
run_test "ESLint Check" "npm run lint" "optional"
count_test

# 4. Integration Tests (full or fast mode)
if [ "$FAST_MODE" = true ]; then
  # Fast mode - just readiness workflow
  run_test "Readiness Workflow Tests" "npm run test:readiness" "required"
  count_test
else
  # Full mode - all integration tests
  run_test "Integration Tests" "npm run test:integration" "required"
  count_test
  
  run_test "Readiness Workflow Tests" "npm run test:readiness" "required"
  count_test
fi

# 5. E2E Tests (full or fast mode)
if [ "$FAST_MODE" = true ]; then
  # Fast mode - just MVP workflow
  run_test "MVP Workflow Tests" "playwright test tests/mvp-workflow.spec.ts" "required"
  count_test
else
  # Full mode - all E2E tests
  run_test "E2E Tests" "npm run test:e2e" "required"
  count_test
  
  run_test "Mobile Tests" "npm run test:mobile" "optional"
  count_test
fi

# 6. Manual feature tests (if not in fast mode)
if [ "$FAST_MODE" = false ]; then
  run_test "Manual Backup Tests" "playwright test tests/manual-backup.spec.ts" "optional"
  count_test
  
  run_test "Policy Tests" "playwright test tests/policy.spec.ts" "optional"
  count_test
fi

# Summary
echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "${BLUE}===============${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  
  if [ "$DEBUG_MODE" = true ]; then
    echo ""
    echo -e "${BLUE}🔍 Debug Mode: Generating test report...${NC}"
    npm run test:report
  fi
  
  exit 0
else
  echo -e "${YELLOW}⚠️  Some tests failed. Check output above for details.${NC}"
  
  if [ "$DEBUG_MODE" = true ]; then
    echo ""
    echo -e "${BLUE}🔍 Debug Mode: Opening Playwright UI for investigation...${NC}"
    npm run test:ui
  fi
  
  exit 1
fi