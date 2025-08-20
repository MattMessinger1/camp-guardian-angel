import { test, expect } from '@playwright/test';

// Simple test to verify Playwright browser opens and works
test.describe('Playwright Browser Test', () => {
  test('can open browser and navigate to home page', async ({ page }) => {
    console.log('Starting browser test...');
    
    await page.goto('/');
    console.log('Navigated to home page');
    
    // Check that the page loads
    await expect(page.locator('body')).toBeVisible();
    console.log('Body is visible');
    
    // Check for basic content
    const title = await page.title();
    console.log('Page title:', title);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/home-page-debug.png' });
    console.log('Screenshot taken');
  });

  test('can navigate to account history page (debug)', async ({ page }) => {
    console.log('Testing account history navigation...');
    
    await page.goto('/account/history');
    console.log('Attempted to navigate to /account/history');
    
    // Check what URL we actually ended up on
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check for any error messages or redirects
    const bodyText = await page.locator('body').textContent();
    console.log('Page content (first 200 chars):', bodyText?.substring(0, 200));
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/account-history-debug.png' });
  });
});