#!/bin/bash

echo "🎯 Running E2E-001: Complete Seattle Parks User Journey Test"
echo "========================================================="

# Set test environment
export NODE_ENV=e2e
export VITEST=false

echo "📋 Test Details:"
echo "- Requirements Discovery → Dynamic Form → Automation → Results"
echo "- Seattle Parks and Community Pass provider"
echo "- Complete user experience validation"
echo ""

echo "🚀 Starting E2E-001 Test..."

npx playwright test tests/complete-user-journey-e2e.spec.ts --grep "E2E-001" --reporter=line --timeout=120000

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 E2E-001 Test PASSED!"
    echo "✅ Requirements Discovery"
    echo "✅ Dynamic Form Generation" 
    echo "✅ Data Collection"
    echo "✅ Automation Execution"
    echo "✅ Results Integration"
else
    echo ""
    echo "❌ E2E-001 test failed. Check output above for details."
    exit 1
fi