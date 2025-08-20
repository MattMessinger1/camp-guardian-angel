#!/bin/bash

# Simple test to run Playwright with isolated config
echo "🔍 Testing Playwright with isolated config..."

# Test with the isolated config we created
npx playwright test tests/basic-test.spec.ts --config=playwright.config.isolated.ts --reporter=line

echo "✅ Test completed"