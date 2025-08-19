#!/bin/bash

# Ready for Signup Feature Testing Script
# Tests all the new readiness features we just built

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🎯 Testing Ready for Signup Features${NC}"
echo ""

# 1. Test Camp Watch Modal (Pre-public camps)
echo -e "${YELLOW}Testing Camp Watch Modal...${NC}"
playwright test tests/readiness-workflow.spec.ts -g "camp watch"

# 2. Test Preparation Guide
echo -e "${YELLOW}Testing Preparation Guide...${NC}"
playwright test tests/readiness-workflow.spec.ts -g "preparation guide"

# 3. Test Payment Authorization Flow
echo -e "${YELLOW}Testing Payment Authorization...${NC}"
playwright test tests/integration-guards.spec.ts -g "payment method"

# 4. Test Readiness Status Updates
echo -e "${YELLOW}Testing Readiness Status...${NC}"
playwright test tests/integration-readiness.spec.ts

# 5. Manual Testing Instructions
echo ""
echo -e "${BLUE}📝 Manual Testing Checklist:${NC}"
echo "1. Go to /sessions and find a pre-public camp"
echo "2. Click 'Get Ready for Signup' button"
echo "3. Test Camp Watch Modal - enter email and preferences"
echo "4. Check Preparation Guide shows correct items"
echo "5. Verify payment authorization works"
echo "6. Test notification preferences"

echo ""
echo -e "${GREEN}✅ Automated tests complete. Run manual tests in Dev Mode.${NC}"