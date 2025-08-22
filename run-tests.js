// Quick test runner to identify workflow issues
const { spawn } = require('child_process');

const tests = [
  { name: 'Step 1: Homepage Loads', file: 'tests/smoke.spec.ts' },
  { name: 'Steps 1-5: MVP Workflow', file: 'tests/mvp-workflow.spec.ts' }, 
  { name: 'Step 6: Account History', file: 'tests/account-history.spec.ts' },
  { name: 'Integration Tests', file: 'tests/ready-to-signup-integration.spec.ts' }
];

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log(`   File: ${test.file}`);
    
    const child = spawn('npx', ['playwright', 'test', test.file, '--reporter=line'], {
      stdio: 'pipe',
      shell: true
    });
    
    let output = '';
    let error = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      error += data.toString(); 
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ PASSED: ${test.name}`);
      } else {
        console.log(`❌ FAILED: ${test.name}`);
        console.log('Output:', output.slice(-300)); // Last 300 chars
        console.log('Error:', error.slice(-300));
      }
      resolve({ name: test.name, success: code === 0, output, error });
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      child.kill();
      console.log(`⏰ TIMEOUT: ${test.name}`);
      resolve({ name: test.name, success: false, output: 'TIMEOUT', error: 'Test timed out' });
    }, 30000);
  });
}

async function runAllTests() {
  console.log('🎯 Running Complete 6-Step Workflow Tests...');
  
  const results = [];
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
  }
  
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  
  console.log('\n📊 Test Results Summary');
  console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n⚠️  Failed Tests:');
    results.filter(r => !r.success).forEach((r, i) => {
      console.log(`${i + 1}. ${r.name}`);
    });
  }
}

runAllTests().catch(console.error);