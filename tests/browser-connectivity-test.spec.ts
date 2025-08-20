import { test, expect } from '@playwright/test';

test.describe('Browser Connectivity Tests', () => {
  test('can open browser and navigate to external site', async ({ page }) => {
    console.log('🚀 Testing basic browser functionality...');
    
    // Test external site first to verify browser works
    await page.goto('https://google.com');
    console.log('✅ Successfully navigated to Google');
    
    // Verify page loaded
    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Page body is visible');
    
    // Get page title to confirm we're on the right page
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    expect(title).toContain('Google');
    console.log('✅ Browser test passed!');
  });

  test('can connect to local dev server', async ({ page }) => {
    console.log('🔗 Testing local dev server connectivity...');
    
    try {
      // Attempt to connect to local dev server
      await page.goto('http://localhost:8080', { 
        timeout: 10000,
        waitUntil: 'domcontentloaded' 
      });
      
      console.log('✅ Successfully connected to localhost:8080');
      
      // Verify the page loaded
      await expect(page.locator('body')).toBeVisible();
      console.log('✅ Local app loaded successfully');
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/local-app-test.png' });
      console.log('📸 Screenshot saved');
      
    } catch (error) {
      console.log('❌ Could not connect to localhost:8080');
      console.log('💡 Make sure dev server is running: npm run dev');
      console.log('Error details:', error.message);
      
      // This test should fail if dev server isn't running
      throw new Error('Dev server not accessible at localhost:8080');
    }
  });
});