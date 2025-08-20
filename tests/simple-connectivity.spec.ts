import { test, expect } from '@playwright/test';

test.describe('Simple Connectivity Test', () => {
  test('Can load home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    console.log('✅ Home page loaded successfully');
  });

  test('Can navigate to sessions page', async ({ page }) => {
    await page.goto('/sessions');
    
    // Wait longer for the page to load
    await page.waitForTimeout(5000);
    
    // Check if we get any content
    const bodyText = await page.textContent('body');
    console.log('Sessions page content preview:', bodyText?.substring(0, 100));
    
    // Basic check that page loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for the h1 heading
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible({ timeout: 10000 });
    
    const headingText = await h1.textContent();
    console.log('Page heading:', headingText);
    
    expect(headingText).toContain('Sessions');
  });
});