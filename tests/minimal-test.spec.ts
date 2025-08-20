import { test } from '@playwright/test';

test('minimal test - zero dependencies', async () => {
  console.log('✅ Playwright is working!');
  console.log('✅ No webServer, no global setup, just pure Playwright');
});