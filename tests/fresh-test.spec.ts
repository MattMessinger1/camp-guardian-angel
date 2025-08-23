import { test, expect } from '@playwright/test';

test('simple connectivity test', async ({ page }) => {
  console.log('🔍 Attempting to load http://localhost:8080');
  await page.goto('http://localhost:8080');
  console.log('✅ Page loaded successfully');
  await expect(page.locator('body')).toBeVisible();
});