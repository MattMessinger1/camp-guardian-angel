#!/bin/bash

# Simple script to test if the issue is webServer related
# Just runs one test without any server to isolate the vitest conflict

echo "🔍 Testing Playwright isolation (no server, no vitest loading)"
echo "This should run without the TypeError if our theory is correct..."
echo ""

npx playwright test --config=playwright.config.no-server.js --reporter=line tests/basic-test.spec.ts