import { test, expect } from '@playwright/test';

test.describe('Simple Tests', () => {
  test('can connect to app', async ({ page }) => {
    console.log('Starting test...');
    await page.goto('http://localhost:8080/');
    console.log('Page loaded, checking for body...');
    await expect(page.locator('body')).toBeVisible();
    console.log('Test passed!');
  });
});