import { test, expect } from '@playwright/test';

// Completely rewritten smoke test to force file update
test('homepage loads correctly', async ({ page }) => {
  console.log('Navigating to http://localhost:8080/');
  await page.goto('http://localhost:8080/');
  console.log('Page loaded, checking body...');
  await expect(page.locator('body')).toBeVisible();
  console.log('Test passed!');
});