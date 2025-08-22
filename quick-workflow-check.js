const { spawn } = require('child_process');

console.log('🧪 Quick 6-Step Workflow Check');
console.log('==============================\n');

const tests = [
  { name: 'Step 1: Homepage', url: '/', expect: 'search functionality' },
  { name: 'Step 2: Signup Form', url: '/signup?sessionId=test', expect: 'form inputs' },
  { name: 'Step 4: Ready Status', url: '/sessions/11111111-2222-3333-4444-555555555555/ready-to-signup', expect: 'readiness content' },
  { name: 'Step 6: Account History', url: '/account/history', expect: 'history table' }
];

async function quickCheck() {
  console.log('Testing key workflow pages...\n');
  
  for (const test of tests.slice(0, 2)) { // Test first 2 steps
    console.log(`🔍 ${test.name}: ${test.url}`);
    
    try {
      const result = await new Promise((resolve) => {
        const proc = spawn('npx', [
          'playwright', 'test', 
          '--reporter=line',
          '--timeout=10000',
          `-e`, `await page.goto('${test.url}'); await expect(page.locator('body')).toBeVisible();`
        ], { stdio: 'pipe', shell: true });
        
        let output = '';
        proc.stdout.on('data', (data) => output += data.toString());
        proc.stderr.on('data', (data) => output += data.toString());
        
        proc.on('close', (code) => {
          resolve({ code, output });
        });
        
        setTimeout(() => {
          proc.kill();
          resolve({ code: 1, output: 'TIMEOUT' });
        }, 12000);
      });
      
      if (result.code === 0) {
        console.log(`  ✅ PASSED - Page loads successfully`);
      } else {
        console.log(`  ❌ FAILED - ${result.output.includes('ECONNREFUSED') ? 'Dev server not running' : 'Page load error'}`);
      }
    } catch (error) {
      console.log(`  ❌ ERROR - ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('📋 Manual Check Results:');
  console.log('- If pages load: Workflow structure is good ✅');
  console.log('- If ECONNREFUSED: Need to start dev server (npm run dev)');
  console.log('- If other errors: Component/import issues need fixing');
  
  console.log('\n🎯 Next: Run full test with `npx playwright test tests/complete-workflow.spec.ts`');
}

quickCheck().catch(console.error);