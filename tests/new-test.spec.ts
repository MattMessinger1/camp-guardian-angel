import { test, expect } from '@playwright/test';

test('new test - absolute URL', async ({ page }) => {
  console.log('Testing with absolute URL: http://localhost:8080');
  await page.goto('http://localhost:8080');
  await expect(page.locator('body')).toBeVisible();
  console.log('SUCCESS: Page loaded!');
});