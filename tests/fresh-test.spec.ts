import { test, expect } from '@playwright/test';

test('connectivity test', async ({ page }) => {
  await page.goto('http://localhost:8080');
  await expect(page.locator('body')).toBeVisible();
});