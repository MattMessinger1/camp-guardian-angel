#!/bin/bash

echo "🎯 Running Complete User Journey End-to-End Tests"
echo "==============================================="

# Set test environment
export NODE_ENV=test

echo "📋 Test Setup:"
echo "- Seattle Parks and Community Pass provider tests"
echo "- Requirements discovery → Data collection → Automation → Results"
echo "- Error handling and recovery scenarios"
echo ""

echo "🚀 Starting Complete User Journey Tests..."

# Run the comprehensive end-to-end test
npx playwright test tests/complete-user-journey-e2e.spec.ts --reporter=line --timeout=60000

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Complete User Journey Tests PASSED!"
    echo "✅ Requirements Discovery"
    echo "✅ Data Collection" 
    echo "✅ Automation Execution"
    echo "✅ Results Integration"
    echo "✅ Error Recovery"
    echo "✅ Multi-Child Flow"
    echo "✅ Cross-Platform Support"
else
    echo ""
    echo "❌ Some tests failed. Check output above for details."
    exit 1
fi