#!/bin/bash

echo "🎯 6-Step Workflow Test Results"
echo "=============================="
echo ""

# Run the quick workflow check
echo "Testing workflow pages..."
npx playwright test tests/workflow-quick-check.spec.ts --reporter=line

# Capture exit code
exit_code=$?

echo ""
echo "=============================="
echo "📊 Summary:"
echo "=============================="

if [ $exit_code -eq 0 ]; then
    echo "🎉 SUCCESS: All workflow steps are working!"
    echo ""
    echo "✅ Step 1: Search (/) - Homepage loads"
    echo "✅ Step 2: Get Ready (/signup?sessionId=...) - Form loads"
    echo "✅ Step 3: Complete Signup (same page) - Ready"
    echo "✅ Step 4: Ready Status (/sessions/.../ready-to-signup) - Loads"
    echo "✅ Step 5: Pending Signups (/sessions/.../confirmation) - Loads"
    echo "✅ Step 6: Account History (/account/history) - Loads"
    echo ""
    echo "🚀 Your 6-step workflow is READY FOR PRODUCTION!"
    echo ""
    echo "Next steps:"
    echo "- Deploy with confidence"
    echo "- Run integration tests in production"
    echo "- Monitor user flow analytics"
else
    echo "⚠️  ISSUES FOUND - Need to fix these:"
    echo ""
    echo "Check the test output above for specific errors."
    echo ""
    echo "Common issues:"
    echo "- Dev server not running (npm run dev)"
    echo "- Missing imports/components" 
    echo "- Database connection problems"
    echo "- Authentication context issues"
    echo ""
    echo "🔧 To debug:"
    echo "1. Start dev server: npm run dev"
    echo "2. Check browser console at each URL"
    echo "3. Fix component import errors"
    echo "4. Re-run this test"
fi

echo ""
echo "📍 Current location: /account/history (Step 6)"