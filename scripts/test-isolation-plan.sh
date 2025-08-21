#!/bin/bash

# Systematic Playwright Testing Plan - Isolate Variables
echo "🔍 SYSTEMATIC PLAYWRIGHT TESTING PLAN"
echo "======================================"
echo ""

# Test 2: Run test with explicit minimal config (skip manual verification for now)
echo "📍 TEST 2: Run test with explicit minimal config"
echo "------------------------------------------------"
echo "Running: npx playwright test tests/manual-backup-fixed.spec.ts --config=playwright.config.minimal.js --headed --reporter=line"
echo ""

npx playwright test tests/manual-backup-fixed.spec.ts --config=playwright.config.minimal.js --headed --reporter=line

TEST2_RESULT=$?

if [ $TEST2_RESULT -eq 0 ]; then
    echo "✅ TEST 2 PASSED - The issue was missing explicit config!"
    exit 0
else
    echo "❌ TEST 2 FAILED - Moving to Test 3..."
    echo ""
fi

# Test 3: Completely isolated test with absolute URLs
echo "📍 TEST 3: Create isolated test with absolute URLs"
echo "---------------------------------------------------"
echo "Running isolated test with absolute URLs..."

npx playwright test tests/isolated-navigation-test.spec.ts --headed --reporter=line

TEST3_RESULT=$?

if [ $TEST3_RESULT -eq 0 ]; then
    echo "✅ TEST 3 PASSED - Playwright CAN navigate to the app!"
else
    echo "❌ TEST 3 FAILED - There's a fundamental navigation issue."
fi

echo ""
echo "🎯 DIAGNOSIS COMPLETE"