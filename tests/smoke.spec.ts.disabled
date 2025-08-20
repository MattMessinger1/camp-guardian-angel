import { test, expect } from '@playwright/test';

// Simplest smoke test: homepage loads and shows some text
test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});
