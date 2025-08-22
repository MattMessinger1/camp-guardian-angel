// Run complete workflow tests and capture results
const { execSync } = require('child_process');

console.log('🎯 Running Complete 6-Step Workflow Tests...\n');

const tests = [
  {
    name: 'Step 1: Homepage Loads',
    command: 'npx playwright test tests/smoke.spec.ts --reporter=line'
  },
  {
    name: 'Steps 1-5: Basic Workflow', 
    command: 'npx playwright test tests/mvp-workflow.spec.ts --reporter=line'
  },
  {
    name: 'Step 6: Account History',
    command: 'npx playwright test tests/account-history.spec.ts --reporter=line'
  },
  {
    name: 'Readiness Workflow (Detailed)',
    command: 'npx playwright test tests/readiness-workflow.spec.ts --reporter=line'
  },
  {
    name: 'Integration Tests (TC-031 to TC-036)',
    command: 'npx playwright test tests/ready-to-signup-integration.spec.ts --reporter=line'
  }
];

let passed = 0;
let failed = 0;
const results = [];

for (const test of tests) {
  console.log(`🧪 Testing: ${test.name}`);
  try {
    const output = execSync(test.command, { timeout: 30000, encoding: 'utf8' });
    console.log(`✅ PASSED: ${test.name}\n`);
    results.push({ name: test.name, status: 'PASSED', output });
    passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${test.name}`);
    console.log(`Error: ${error.message}\n`);
    results.push({ name: test.name, status: 'FAILED', error: error.message });
    failed++;
  }
}

console.log('\n📊 Test Results Summary');
console.log(`Total Test Suites: ${tests.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed === 0) {
  console.log('🎉 All tests passed! Workflow is working correctly.');
} else {
  console.log('⚠️  Issues found that need fixing:');
  results.filter(r => r.status === 'FAILED').forEach((result, i) => {
    console.log(`${i + 1}. ${result.name}: ${result.error}`);
  });
}

console.log('\n📝 6-Step Workflow URLs:');
console.log('Step 1: Search (/ or /find-camps)');
console.log('Step 2: Get Ready for Signup (/signup?sessionId=${sessionId})');
console.log('Step 3: Complete Your Signup (same page)');
console.log('Step 4: Ready for Signup Status (/sessions/${sessionId}/ready-to-signup)');
console.log('Step 5: Pending Signups (/sessions/${sessionId}/confirmation)');
console.log('Step 6: Account History (/account/history)');