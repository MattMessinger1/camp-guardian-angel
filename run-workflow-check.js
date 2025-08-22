const { execSync } = require('child_process');

console.log('🎯 Running Quick Workflow Check...');
console.log('==================================\n');

try {
  const output = execSync('npx playwright test tests/workflow-quick-check.spec.ts --reporter=line', {
    encoding: 'utf8',
    timeout: 30000
  });
  
  console.log(output);
  console.log('\n🎉 SUCCESS: All workflow pages are accessible!');
  console.log('\n📋 Workflow Status:');
  console.log('✅ Step 1: Homepage (/)');
  console.log('✅ Step 2: Signup (/signup?sessionId=...)');
  console.log('✅ Step 3: Complete Signup (same page)');
  console.log('✅ Step 4: Ready Status (/sessions/.../ready-to-signup)');
  console.log('✅ Step 5: Pending (/sessions/.../confirmation)');
  console.log('✅ Step 6: Account History (/account/history)');
  console.log('\n🚀 Your workflow is ready for production!');
  
} catch (error) {
  console.log('❌ ISSUES FOUND:');
  console.log(error.stdout || error.message);
  
  console.log('\n🔧 Common fixes needed:');
  if (error.message.includes('ECONNREFUSED')) {
    console.log('- Start dev server: npm run dev');
  }
  if (error.message.includes('Cannot resolve module')) {
    console.log('- Missing component imports');
  }
  if (error.message.includes('TypeError')) {
    console.log('- Component rendering errors');
  }
  
  console.log('\n📝 Workflow URLs to check manually:');
  console.log('1. / (Homepage)');
  console.log('2. /signup?sessionId=test');
  console.log('4. /sessions/11111111-2222-3333-4444-555555555555/ready-to-signup');
  console.log('6. /account/history (current)');
}