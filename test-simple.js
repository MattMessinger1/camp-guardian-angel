// Ultra-simple test - no TypeScript, no configs, just works
const { test, expect } = require('@playwright/test');

test('app loads', async ({ page }) => {
  console.log('Testing app at http://localhost:8080/');
  await page.goto('http://localhost:8080/');
  console.log('Page loaded successfully!');
  await expect(page.locator('body')).toBeVisible();
});