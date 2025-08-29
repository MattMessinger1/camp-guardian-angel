#!/bin/bash

echo "🎯 Running ONLY E2E-001: Complete Seattle Parks User Journey Test"
echo "================================================================"

# Set test environment
export NODE_ENV=e2e
export VITEST=false

echo "📋 Test: Requirements Discovery → Dynamic Form → Automation → Results"
echo ""

echo "🚀 Starting E2E-001 Test..."

npx playwright test tests/complete-user-journey-e2e.spec.ts --grep "E2E-001" --reporter=line --timeout=120000 --headed

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 E2E-001 Test PASSED!"
    echo "✅ Requirements Discovery ✅ Data Collection ✅ Automation ✅ Results"
else
    echo ""
    echo "❌ E2E-001 test failed. Let's debug..."
    exit 1
fi