import { test } from '@playwright/test';

test('minimal browser test', async ({ page }) => {
  console.log('Test starting...');
  await page.goto('https://google.com');
  console.log('Navigated to Google');
  await page.waitForTimeout(3000);
});