#!/bin/bash

# Test Environment Setup and Execution
# Handles proper separation between unit tests (Vitest) and E2E tests (Playwright)

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

TEST_TYPE=${1:-"all"}

echo -e "${BLUE}🧪 Test Environment Setup${NC}"
echo ""

# Function to cleanup processes
cleanup() {
  if [ ! -z "$DEV_PID" ]; then
    echo -e "${YELLOW}Cleaning up dev server...${NC}"
    kill $DEV_PID 2>/dev/null || true
  fi
}

# Set trap to cleanup on exit
trap cleanup EXIT

case $TEST_TYPE in
  "e2e")
    echo -e "${YELLOW}Running E2E Tests (Playwright)...${NC}"
    echo -e "${YELLOW}Starting dev server...${NC}"
    npm run dev &
    DEV_PID=$!
    sleep 5
    
    echo -e "${YELLOW}Running Playwright tests...${NC}"
    npx playwright test --reporter=line
    ;;
  "readiness")
    echo -e "${YELLOW}Running Readiness Test Suite...${NC}"
    echo -e "${YELLOW}Starting dev server...${NC}"
    npm run dev &
    DEV_PID=$!
    sleep 5
    
    npx playwright test tests/ready-to-signup-*.spec.ts tests/readiness-*.spec.ts tests/integration-*.spec.ts tests/unit/readiness-*.test.ts --reporter=line
    ;;
  *)
    echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
    echo "Usage: $0 [e2e|readiness]"
    exit 1
    ;;
esac

echo -e "${GREEN}✅ Tests completed!${NC}"