import { test, expect } from '@playwright/test';

// Test if Playwright can navigate to localhost:8080 at all
test('isolated navigation test', async ({ page }) => {
  console.log('🔍 Testing navigation to http://localhost:8080');
  await page.goto('http://localhost:8080');
  
  console.log('✅ Basic navigation works, checking for React content...');
  await expect(page.locator('body')).toBeVisible();
  
  console.log('🔍 Testing manual backup route...');
  await page.goto('http://localhost:8080/manual-backup/test-id');
  
  console.log('🔍 Looking for test elements...');
  await expect(page.getByTestId('failure-reason')).toBeVisible();
  await expect(page.getByTestId('manual-backup-link')).toBeVisible();
  
  console.log('✅ All navigation and element checks passed!');
});