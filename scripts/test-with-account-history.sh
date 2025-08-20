#!/bin/bash

# Enhanced test script that includes account history tests
echo "🧪 Running enhanced test suite with Account History..."

# Run smoke tests first
echo "🔥 Running smoke tests..."
npx playwright test tests/smoke.spec.ts --project=chromium

if [ $? -ne 0 ]; then
    echo "❌ Smoke tests failed! Stopping."
    exit 1
fi

# Run account history tests
echo "📊 Running Account History tests..."
npx playwright test tests/account-history.spec.ts --project=chromium

if [ $? -ne 0 ]; then
    echo "❌ Account History tests failed!"
    exit 1
fi

# Run other key tests
echo "🎯 Running other key tests..."
npx playwright test tests/session-cards.spec.ts tests/reservation-form.spec.ts --project=chromium

if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed!"
    exit 1
fi