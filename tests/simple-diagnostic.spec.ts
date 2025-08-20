import { test, expect } from '@playwright/test';

test('what happens on sessions page', async ({ page }) => {
  console.log('🔍 Starting diagnostic...');
  
  await page.goto('/sessions');
  await page.waitForTimeout(3000);
  
  const title = await page.title();
  const bodyText = await page.textContent('body');
  const h1Text = await page.locator('h1').textContent();
  const sessionCards = await page.locator('[data-testid="session-card"]').count();
  
  console.log(`Title: "${title}"`);
  console.log(`H1: "${h1Text}"`);
  console.log(`Session cards: ${sessionCards}`);
  console.log(`Body preview: ${bodyText?.substring(0, 200)}`);
  
  await page.screenshot({ path: 'diagnostic.png' });
  console.log('Screenshot saved');
  
  expect(true).toBe(true);
});