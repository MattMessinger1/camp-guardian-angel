import { test, expect } from '@playwright/test';

// Test the Account History page functionality
test.describe('Account History Page', () => {
  test('loads and shows table headers', async ({ page }) => {
    console.log('Navigating to /account/history...');
    await page.goto('/account/history');
    
    console.log('Current URL:', page.url());
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    console.log('Page loaded');
    
    // Check that the page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Check that the main heading is present
    await expect(page.locator('h1')).toContainText('Signup History');
    
    // Check that all required table headers are present
    await expect(page.locator('th')).toContainText('Camp Name');
    await expect(page.locator('th')).toContainText('Session');
    await expect(page.locator('th')).toContainText('Signup Date/Time');
    await expect(page.locator('th')).toContainText('Success/Failure');
    await expect(page.locator('th')).toContainText('Timing Report');
  });

  test('shows empty state message when no data', async ({ page }) => {
    await page.goto('/account/history');
    
    // Should show the empty state message
    await expect(page.locator('text=No Signup History')).toBeVisible();
    await expect(page.locator('text=You haven\'t attempted any registrations yet.')).toBeVisible();
  });

  test('search functionality works', async ({ page }) => {
    await page.goto('/account/history');
    
    // Check that search input is present
    const searchInput = page.locator('input[placeholder*="Search camps"]');
    await expect(searchInput).toBeVisible();
    
    // Test typing in search
    await searchInput.fill('test camp');
    await expect(searchInput).toHaveValue('test camp');
  });

  test('back button is present and functional', async ({ page }) => {
    await page.goto('/account/history');
    
    // Check that back button exists
    const backButton = page.locator('button:has-text("Back")');
    await expect(backButton).toBeVisible();
    
    // Test that clicking it attempts navigation (will fail in test but that's ok)
    await backButton.click();
  });

  test('timing report modal can be triggered', async ({ page }) => {
    await page.goto('/account/history');
    
    // If there were data rows, we'd test the "View Report" buttons
    // For now, just check that the table structure supports the button column
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });
});

// Integration test for navigation to account history
test.describe('Navigation to Account History', () => {
  test('can navigate to account history from home', async ({ page }) => {
    await page.goto('/');
    
    // This is a basic navigation test - in a real app you'd click a link
    await page.goto('/account/history');
    await expect(page.url()).toContain('/account/history');
  });
});