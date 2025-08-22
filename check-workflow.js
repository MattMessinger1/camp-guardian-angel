const { execSync } = require('child_process');

console.log('🎯 Testing 6-Step Workflow...\n');

const tests = [
  {
    name: 'Step 1: Homepage Smoke Test',
    cmd: 'npx playwright test tests/smoke.spec.ts --reporter=line --timeout=10000'
  },
  {
    name: 'Steps 1-5: MVP Workflow',
    cmd: 'npx playwright test tests/mvp-workflow.spec.ts --reporter=line --timeout=15000'
  },
  {
    name: 'Step 6: Account History',
    cmd: 'npx playwright test tests/account-history.spec.ts --reporter=line --timeout=10000'
  }
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  console.log(`🧪 Testing: ${test.name}`);
  try {
    const output = execSync(test.cmd, { 
      encoding: 'utf8', 
      timeout: 20000,
      stdio: 'pipe'
    });
    console.log(`✅ PASSED: ${test.name}`);
    console.log(`Output: ${output.slice(-200)}...\n`);
    passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${test.name}`);
    console.log(`Error: ${error.message}`);
    if (error.stdout) console.log(`Stdout: ${error.stdout.slice(-300)}`);
    if (error.stderr) console.log(`Stderr: ${error.stderr.slice(-300)}`);
    console.log('');
    failed++;
  }
}

console.log('📊 Summary:');
console.log(`Passed: ${passed}, Failed: ${failed}`);

if (failed > 0) {
  console.log('\n⚠️  Issues found - let\'s fix them!');
} else {
  console.log('\n🎉 All basic workflow tests passed!');
}