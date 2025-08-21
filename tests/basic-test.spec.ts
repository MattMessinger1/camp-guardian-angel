import { test } from '@playwright/test';

test('basic test - now with navigation', async ({ page }) => {
  console.log('✅ Playwright started successfully!');
  console.log('Now testing navigation to http://localhost:8080/');
  await page.goto('http://localhost:8080/');
  console.log('✅ Navigation successful!');
});