#!/bin/bash

# Completely isolated Playwright execution - no vitest conflicts
echo "🔧 Running Playwright in isolated environment"

# Clear all test-related environment variables
unset VITEST
unset JEST_WORKER_ID
unset NODE_OPTIONS

# Set clean environment
export NODE_ENV=test
export VITEST=false

# Clear module cache to prevent symbol conflicts
rm -rf node_modules/.vite/
rm -rf test-results/

echo "🚀 Starting dev server on port 8080..."
npm run dev &
DEV_PID=$!

# Wait for server to start
sleep 5

echo "🧪 Running Playwright test..."
# Use npx with fresh process to avoid symbol conflicts
NODE_OPTIONS="" npx --node-options="" playwright test tests/manual-backup-fixed.spec.ts --config=playwright.config.minimal.js --headed --reporter=line

TEST_RESULT=$?

# Cleanup
kill $DEV_PID 2>/dev/null || true

if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ Test passed!"
else
    echo "❌ Test failed with exit code: $TEST_RESULT"
fi

exit $TEST_RESULT