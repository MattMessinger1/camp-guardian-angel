#!/bin/bash

# Quick symbol isolation test
echo "🔬 Testing symbol isolation with static file server..."
echo ""

echo "Test 1: Basic test (no expect import)"
npx playwright test tests/basic-test.spec.ts --config=playwright.config.clean.ts --reporter=line

echo ""
echo "Test 2: Test with expect import (the critical test)"
npx playwright test tests/manual-backup.spec.ts --config=playwright.config.clean.ts --reporter=line 2>&1 | tee test-output.log

if grep -q "Cannot redefine property: Symbol" test-output.log; then
    echo "❌ Symbol conflict still present"
else
    echo "✅ Symbol conflict resolved!"
fi

rm -f test-output.log