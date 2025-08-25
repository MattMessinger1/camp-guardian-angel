#!/bin/bash

echo "🎯 Testing Updated 4-Step User Workflow"
echo "======================================"
echo ""

# Run the updated workflow test
npx playwright test tests/updated-workflow.spec.ts --reporter=line

exit_code=$?

echo ""
echo "======================================"
echo "📊 Updated Workflow Summary:"
echo "======================================"

if [ $exit_code -eq 0 ]; then
    echo "🎉 SUCCESS: Your updated 4-step workflow is working perfectly!"
    echo ""
    echo "✅ Step 1: Homepage Search - Users can search and find activities"
    echo "✅ Step 2: Information Collection - Users add info and agree to fees"  
    echo "✅ Step 3: Confirmation - Shows next steps + sends text confirmation"
    echo "✅ Step 4: Account History - Users can track all their signups"
    echo ""
    echo "🚀 Your optimized workflow is production-ready!"
    echo ""
    echo "Key improvements from 6-step to 4-step workflow:"
    echo "• Streamlined user journey"
    echo "• Clear payment consent upfront"
    echo "• Single confirmation page"
    echo "• Centralized account history"
else
    echo "⚠️  Issues found - Let's address them:"
    echo ""
    echo "Check the test output above for specific errors."
    echo ""
    echo "🔧 To debug:"
    echo "1. Ensure dev server is running: npm run dev"
    echo "2. Check browser console for any errors"
    echo "3. Verify all routes are accessible"
fi

echo ""
echo "🎯 Current Workflow URLs:"
echo "Step 1: / (Homepage search)"
echo "Step 2: /signup?sessionId=... (Information & payment consent)"
echo "Step 3: /sessions/.../signup-submitted (Confirmation)"
echo "Step 4: /account-history (Track signups)"