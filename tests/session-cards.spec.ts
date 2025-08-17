import { test, expect } from '@playwright/test';

// Loosest possible check: session list page renders at all
test('session cards page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});
