import { test, expect } from '@playwright/test';

test.describe('Debug Sessions Page', () => {
  test('Debug: Check basic page load and elements', async ({ page }) => {
    console.log('=== DEBUGGING SESSION PAGE ===');
    
    // Navigate to sessions page
    console.log('1. Navigating to /sessions...');
    await page.goto('/sessions');
    
    // Wait a moment for page to load
    await page.waitForTimeout(2000);
    
    // Check if page loaded
    console.log('2. Checking if page loaded...');
    const url = page.url();
    console.log('Current URL:', url);
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check if body is visible
    const bodyVisible = await page.locator('body').isVisible();
    console.log('Body visible:', bodyVisible);
    
    // Get all text content from body
    const bodyText = await page.textContent('body');
    console.log('Body text preview:', bodyText?.substring(0, 200) + '...');
    
    // Check for h1 element
    const h1Elements = await page.locator('h1').count();
    console.log('H1 elements found:', h1Elements);
    
    if (h1Elements > 0) {
      const h1Text = await page.locator('h1').textContent();
      console.log('H1 text:', h1Text);
    }
    
    // Check for session cards
    const sessionCards = await page.locator('[data-testid="session-card"]').count();
    console.log('Session cards with data-testid found:', sessionCards);
    
    // Check for any links starting with /sessions/
    const sessionLinks = await page.locator('a[href^="/sessions/"]').count();
    console.log('Session links found:', sessionLinks);
    
    // Check for Create Session button
    const createButton = await page.locator('text="Create Session"').count();
    console.log('Create Session buttons found:', createButton);
    
    // Check for loading text
    const loadingText = await page.locator('text="Loading"').count();
    console.log('Loading indicators found:', loadingText);
    
    // Check for error text
    const errorText = await page.locator('text="Error"').count();
    console.log('Error indicators found:', errorText);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-sessions-page.png', fullPage: true });
    console.log('Screenshot saved as debug-sessions-page.png');
    
    console.log('=== END DEBUG ===');
    
    // Basic assertion to make test pass
    expect(bodyVisible).toBe(true);
  });
  
  test('Debug: Check network requests', async ({ page }) => {
    console.log('=== DEBUGGING NETWORK REQUESTS ===');
    
    // Listen to network requests
    page.on('request', request => {
      console.log('Request:', request.method(), request.url());
    });
    
    page.on('response', response => {
      console.log('Response:', response.status(), response.url());
    });
    
    // Navigate to sessions page
    await page.goto('/sessions');
    await page.waitForTimeout(3000);
    
    console.log('=== END NETWORK DEBUG ===');
  });
});