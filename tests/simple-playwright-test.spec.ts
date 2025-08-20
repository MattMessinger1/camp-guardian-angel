import { test, expect } from '@playwright/test';

test('simple playwright test - just check if it works', async ({ page }) => {
  console.log('🧪 Testing basic Playwright functionality...');
  
  try {
    // Navigate to home page first to test basic functionality
    await page.goto('/');
    console.log('✅ Successfully navigated to home page');
    
    // Check if body is visible
    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Body is visible');
    
    console.log('🎉 Playwright is working correctly!');
  } catch (error) {
    console.log('❌ Playwright test failed:', error);
    throw error;
  }
});