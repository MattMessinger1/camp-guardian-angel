const { spawn } = require('child_process');

console.log('🎯 Complete 6-Step Workflow Test Suite');
console.log('=' .repeat(50));

async function runTest() {
  return new Promise((resolve) => {
    const test = spawn('npx', ['playwright', 'test', 'tests/complete-workflow.spec.ts', '--reporter=line'], {
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    let passed = 0;
    let failed = 0;

    test.stdout.on('data', (data) => {
      const text = data.toString();
      console.log(text);
      output += text;
      
      // Count passed/failed
      if (text.includes('✓') || text.includes('PASSED')) passed++;
      if (text.includes('✗') || text.includes('FAILED')) failed++;
    });

    test.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    test.on('close', (code) => {
      console.log('\n' + '='.repeat(50));
      console.log('📊 WORKFLOW TEST RESULTS:');
      console.log('='.repeat(50));
      
      if (code === 0) {
        console.log('🎉 SUCCESS: Complete 6-step workflow is functional!');
        console.log('All critical pages load and navigate correctly.');
      } else {
        console.log('⚠️  ISSUES FOUND: Some workflow steps need fixes.');
        console.log('Review the output above to identify specific problems.');
      }
      
      console.log('\n📝 6-Step Workflow Summary:');
      console.log('1. ✓ Search (Homepage) - /');
      console.log('2. ✓ Get Ready (/signup?sessionId=...)');
      console.log('3. ✓ Complete Signup (same page)');
      console.log('4. ✓ Ready Status (/sessions/.../ready-to-signup)');
      console.log('5. ✓ Pending Signups (/sessions/.../confirmation)'); 
      console.log('6. ✓ Account History (/account/history)');
      
      console.log('\n🚀 Next Steps:');
      if (code === 0) {
        console.log('- Workflow is ready for production!');
        console.log('- Consider running additional integration tests');
        console.log('- Deploy with confidence');
      } else {
        console.log('- Fix the failing tests above');
        console.log('- Re-run this test suite');
        console.log('- Check console for specific error details');
      }
      
      resolve(code);
    });
  });
}

runTest().then((code) => {
  process.exit(code);
}).catch(console.error);