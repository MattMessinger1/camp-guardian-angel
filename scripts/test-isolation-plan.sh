#!/bin/bash

# Systematic Playwright Testing Plan - Isolate Variables
# This script executes our 3-step plan to identify the root cause

echo "🔍 SYSTEMATIC PLAYWRIGHT TESTING PLAN"
echo "======================================"
echo ""

# Test 1: Verify dev server accessibility
echo "📍 TEST 1: Verify dev server is running and accessible"
echo "------------------------------------------------------"
echo "Please confirm:"
echo "1. Run 'npm run dev' in another terminal"
echo "2. Verify it shows 'Local: http://localhost:8080'"
echo "3. Open http://localhost:8080/manual-backup/test-id in browser"
echo "4. Confirm you see 'Manual Backup' page with test elements"
echo ""
read -p "Press Enter when dev server is confirmed working..."
echo ""

# Test 2: Run test with explicit minimal config
echo "📍 TEST 2: Run test with explicit minimal config"
echo "------------------------------------------------"
echo "Running: npx playwright test tests/manual-backup-fixed.spec.ts --config=playwright.config.minimal.js --headed --reporter=line"
echo ""

npx playwright test tests/manual-backup-fixed.spec.ts --config=playwright.config.minimal.js --headed --reporter=line

TEST2_RESULT=$?

if [ $TEST2_RESULT -eq 0 ]; then
    echo "✅ TEST 2 PASSED - The issue was missing explicit config!"
    echo "Solution: Always specify --config=playwright.config.minimal.js"
    exit 0
else
    echo "❌ TEST 2 FAILED - Moving to Test 3..."
    echo ""
fi

# Test 3: Completely isolated test with absolute URLs
echo "📍 TEST 3: Create isolated test with absolute URLs"
echo "---------------------------------------------------"
echo "Creating and running isolated test..."

# Create isolated test file
cat > tests/isolated-navigation-test.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

// Test if Playwright can navigate to localhost:8080 at all
test('can navigate to localhost:8080', async ({ page }) => {
  console.log('Attempting to navigate to http://localhost:8080');
  await page.goto('http://localhost:8080');
  
  console.log('Navigation successful, checking for React app...');
  // Just check if we can see any React content
  await expect(page.locator('body')).toBeVisible();
  
  console.log('Basic navigation works, testing manual backup route...');
  await page.goto('http://localhost:8080/manual-backup/test-id');
  
  console.log('Checking for test elements...');
  await expect(page.getByTestId('failure-reason')).toBeVisible();
  await expect(page.getByTestId('manual-backup-link')).toBeVisible();
  
  console.log('✅ All checks passed!');
});
EOF

echo "Running isolated test..."
npx playwright test tests/isolated-navigation-test.spec.ts --headed --reporter=line

TEST3_RESULT=$?

if [ $TEST3_RESULT -eq 0 ]; then
    echo "✅ TEST 3 PASSED - Playwright CAN navigate to the app!"
    echo "The issue is likely with baseURL configuration or test setup."
else
    echo "❌ TEST 3 FAILED - There's a fundamental issue with navigation."
    echo "Check if dev server is actually running on port 8080."
fi

echo ""
echo "🎯 DIAGNOSIS COMPLETE"
echo "===================="