import { test, expect } from '@playwright/test';

// Fresh smoke test to bypass caching issues
test('homepage loads correctly', async ({ page }) => {
  await page.goto('http://localhost:8080/');
  await expect(page.locator('body')).toBeVisible();
});