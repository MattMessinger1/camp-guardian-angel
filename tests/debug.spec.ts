import { test, expect } from '@playwright/test';

test('debug test with absolute URL', async ({ page }) => {
  // Use absolute URL to bypass baseURL issues
  await page.goto('http://localhost:8080');
  await expect(page.locator('body')).toBeVisible();
  console.log('✅ Successfully loaded with absolute URL');
});