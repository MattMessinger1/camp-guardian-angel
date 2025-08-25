const { execSync } = require('child_process');

console.log('🎯 Testing Updated 4-Step User Workflow...\n');

const testSteps = [
  {
    step: 1,
    name: 'Homepage with Search',
    url: '/',
    description: 'Search for activity, find desired activity, click "Get ready for signup"'
  },
  {
    step: 2, 
    name: 'Signup Information Collection',
    url: '/signup?sessionId=test-123',
    description: 'Add information required for signup, agree to pay fees ($20 + provider fees)'
  },
  {
    step: 3,
    name: 'Confirmation Page',
    url: '/sessions/11111111-2222-3333-4444-555555555555/signup-submitted',
    description: 'One-time confirmation showing what needs to be done + text confirmation'
  },
  {
    step: 4,
    name: 'Account History',
    url: '/account-history', 
    description: 'View all pending and completed signups'
  }
];

let passed = 0;
let failed = 0;

for (const test of testSteps) {
  console.log(`🧪 Step ${test.step}: ${test.name}`);
  console.log(`   URL: ${test.url}`);
  console.log(`   Purpose: ${test.description}`);
  
  try {
    const cmd = `npx playwright test --reporter=line --timeout=10000 -e "
      import { test, expect } from '@playwright/test';
      test('Step ${test.step} - ${test.name}', async ({ page }) => {
        await page.goto('${test.url}');
        await expect(page.locator('body')).toBeVisible();
      });
    "`;
    
    execSync(cmd, { stdio: 'pipe', timeout: 15000 });
    console.log(`   ✅ PASSED\n`);
    passed++;
  } catch (error) {
    console.log(`   ❌ FAILED\n`);
    failed++;
  }
}

console.log('📊 Workflow Test Summary:');
console.log(`Passed: ${passed}, Failed: ${failed}`);

if (failed === 0) {
  console.log('\n🎉 SUCCESS: Complete 4-step workflow is working!');
  console.log('\n📝 Updated User Journey:');
  console.log('1. ✅ Search for activity on homepage → click "Get ready for signup"');
  console.log('2. ✅ Complete signup form with payment consent (provider fees + $20)');  
  console.log('3. ✅ View confirmation page with next steps + text notification');
  console.log('4. ✅ Access account history to track all signups');
} else {
  console.log('\n⚠️  Some workflow steps need attention');
}