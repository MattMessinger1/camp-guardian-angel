import { test, expect } from '@playwright/test';

test.describe('Quick Workflow Check', () => {
  test.setTimeout(15000);

  test('Homepage loads (Step 1)', async ({ page }) => {
    console.log('Testing Step 1: Homepage...');
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Homepage loads successfully');
  });

  test('Signup page loads (Step 2)', async ({ page }) => {
    console.log('Testing Step 2: Signup form...');
    await page.goto('/signup?sessionId=test-123');
    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Signup page loads successfully');
  });

  test('Ready-to-signup page loads (Step 4)', async ({ page }) => {
    console.log('Testing Step 4: Ready for signup...');
    await page.goto('/sessions/11111111-2222-3333-4444-555555555555/ready-to-signup');
    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Ready-to-signup page loads successfully');
  });

  test('Account history loads (Step 6)', async ({ page }) => {
    console.log('Testing Step 6: Account history...');
    await page.goto('/account/history');
    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Account history page loads successfully');
  });

  test('All workflow URLs are accessible', async ({ page }) => {
    console.log('Testing all workflow navigation...');
    
    const urls = [
      '/', // Step 1
      '/signup?sessionId=test', // Step 2
      '/sessions/11111111-2222-3333-4444-555555555555/ready-to-signup', // Step 4  
      '/sessions/11111111-2222-3333-4444-555555555555/confirmation', // Step 5
      '/account/history' // Step 6
    ];
    
    for (const url of urls) {
      console.log(`Checking ${url}...`);
      await page.goto(url);
      await expect(page.locator('body')).toBeVisible();
    }
    
    console.log('✅ All workflow URLs accessible');
  });
});