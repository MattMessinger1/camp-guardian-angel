import { test, expect } from '@playwright/test';

test('DIAGNOSTIC: What actually happens on /sessions page', async ({ page }) => {
  console.log('🔍 DIAGNOSTIC: Starting sessions page investigation...');
  
  // Step 1: Can we reach the page at all?
  console.log('Step 1: Navigating to /sessions...');
  const response = await page.goto('/sessions');
  console.log(`Response status: ${response?.status()}`);
  
  // Step 2: Wait a moment for React to load
  await page.waitForTimeout(3000);
  
  // Step 3: What's in the page title?
  const title = await page.title();
  console.log(`Page title: "${title}"`);
  
  // Step 4: What's the full body content?
  const bodyText = await page.textContent('body');
  console.log(`Body content (first 500 chars): ${bodyText?.substring(0, 500)}`);
  
  // Step 5: What HTML elements exist?
  const h1Count = await page.locator('h1').count();
  const h1Text = h1Count > 0 ? await page.locator('h1').textContent() : 'NO H1 FOUND';
  console.log(`H1 elements: ${h1Count}, text: "${h1Text}"`);
  
  // Step 6: Check for loading indicators
  const loadingElements = await page.locator('text=Loading').count();
  console.log(`Loading indicators: ${loadingElements}`);
  
  // Step 7: Check for error messages
  const errorElements = await page.locator('text=Error').count();
  console.log(`Error messages: ${errorElements}`);
  
  // Step 8: Check for session cards
  const sessionCards = await page.locator('[data-testid="session-card"]').count();
  console.log(`Session cards found: ${sessionCards}`);
  
  // Step 9: Check for "No sessions found" message
  const noSessionsText = bodyText?.includes('No sessions found');
  console.log(`Contains "No sessions found": ${noSessionsText}`);
  
  // Step 10: Take a screenshot for visual debugging
  await page.screenshot({ path: 'test-results/diagnostic-sessions.png', fullPage: true });
  console.log('📸 Screenshot saved to test-results/diagnostic-sessions.png');
  
  // Step 11: Check browser console for errors
  const logs: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logs.push(`CONSOLE ERROR: ${msg.text()}`);
    }
  });
  
  await page.waitForTimeout(2000); // Give time for any console errors
  
  if (logs.length > 0) {
    console.log('🚨 Console errors detected:');
    logs.forEach(log => console.log(log));
  } else {
    console.log('✅ No console errors detected');
  }
  
  // The test passes regardless - we just want diagnostic info
  expect(true).toBe(true);
  
  console.log('🏁 DIAGNOSTIC: Investigation complete');
});