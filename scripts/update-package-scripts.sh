#!/bin/bash

# Update package.json scripts for vision analysis testing
# This script adds the necessary test scripts to package.json

echo "🔧 Adding vision analysis test scripts to package.json"

# Backup package.json
cp package.json package.json.backup

# Add new scripts using npm pkg
npm pkg set scripts.test:vision="playwright test tests/unit/vision-analysis.test.ts tests/vision-analysis-scenarios.spec.ts"
npm pkg set scripts.test:vision:ui="playwright test tests/unit/vision-analysis.test.ts tests/vision-analysis-scenarios.spec.ts --ui"
npm pkg set scripts.test:vision:full="bash scripts/test-vision-analysis.sh"

echo "✅ Added vision analysis test scripts:"
echo "  - npm run test:vision"
echo "  - npm run test:vision:ui" 
echo "  - npm run test:vision:full"

echo ""
echo "📋 Updated package.json scripts section:"
npm pkg get scripts