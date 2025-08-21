import { test, expect } from '@playwright/test';

// Brand new test file to bypass caching issues
test('fresh test - app connection', async ({ page }) => {
  console.log('=== FRESH TEST STARTING ===');
  console.log('Navigating to: http://localhost:8080/');
  await page.goto('http://localhost:8080/');
  console.log('Navigation complete, checking body visibility...');
  await expect(page.locator('body')).toBeVisible();
  console.log('=== TEST PASSED ===');
});