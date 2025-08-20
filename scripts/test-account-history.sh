#!/bin/bash

# Test script specifically for Account History functionality
echo "🧪 Running Account History Tests..."

# Run the account history specific tests
npx playwright test tests/account-history.spec.ts --project=chromium

# Check exit code
if [ $? -eq 0 ]; then
    echo "✅ Account History tests passed!"
else
    echo "❌ Account History tests failed!"
    exit 1
fi