#!/bin/bash
echo "🎯 Testing Complete 6-Step Workflow..."
echo "======================================"

# Run the workflow test
npx playwright test tests/complete-workflow.spec.ts --reporter=line --timeout=20000

exit_code=$?

echo ""
echo "======================================"
echo "📊 Test Results Summary"
echo "======================================"

if [ $exit_code -eq 0 ]; then
    echo "🎉 SUCCESS: All 6 workflow steps are working!"
    echo ""
    echo "✅ Step 1: Homepage Search - PASSED"
    echo "✅ Step 2: Get Ready for Signup - PASSED" 
    echo "✅ Step 3: Complete Signup Form - PASSED"
    echo "✅ Step 4: Ready for Signup Status - PASSED"
    echo "✅ Step 5: Pending Signups Page - PASSED"
    echo "✅ Step 6: Account History - PASSED"
    echo ""
    echo "🚀 Your workflow is ready for production!"
else
    echo "⚠️  ISSUES FOUND - Need to fix:"
    echo ""
    echo "The test output above shows which specific steps failed."
    echo "Common issues to check:"
    echo "- Dev server running on localhost:8080"
    echo "- Missing components or imports"
    echo "- Database connection issues"
    echo "- Component rendering errors"
fi

echo ""
echo "🎯 Current Location: /account/history (Step 6)"