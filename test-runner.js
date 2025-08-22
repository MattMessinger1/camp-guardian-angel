const { spawn } = require('child_process');

console.log('🎯 Running Complete 6-Step Workflow Test...\n');

const child = spawn('npx', ['playwright', 'test', 'tests/complete-workflow.spec.ts', '--reporter=line', '--timeout=20000'], {
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  console.log(`\n📊 Test completed with exit code: ${code}`);
  
  if (code === 0) {
    console.log('🎉 SUCCESS: All workflow steps are working!');
  } else {
    console.log('⚠️  ISSUES FOUND: Let\'s identify and fix them.');
  }
  
  console.log('\n📝 Workflow Steps Tested:');
  console.log('1. Homepage Search (/)');
  console.log('2. Get Ready (/signup?sessionId=...)');  
  console.log('3. Complete Signup (same page)');
  console.log('4. Ready Status (/sessions/.../ready-to-signup)');
  console.log('5. Pending Signups (/sessions/.../confirmation)');
  console.log('6. Account History (/account/history)');
});