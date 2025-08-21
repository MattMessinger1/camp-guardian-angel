import { test, expect } from '@playwright/test';

// Test if Playwright can navigate to localhost:8080 at all
test('can navigate to localhost:8080', async ({ page }) => {
  console.log('Attempting to navigate to http://localhost:8080');
  await page.goto('http://localhost:8080');
  
  console.log('Navigation successful, checking for React app...');
  // Just check if we can see any React content
  await expect(page.locator('body')).toBeVisible();
  
  console.log('Basic navigation works, testing manual backup route...');
  await page.goto('http://localhost:8080/manual-backup/test-id');
  
  console.log('Checking for test elements...');
  await expect(page.getByTestId('failure-reason')).toBeVisible();
  await expect(page.getByTestId('manual-backup-link')).toBeVisible();
  
  console.log('✅ All checks passed!');
});