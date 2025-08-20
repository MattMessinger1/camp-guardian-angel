import { test, expect } from '@playwright/test';

test('sessions page loads uniquely with debugging', async ({ page }) => {
  console.log('🔍 UNIQUE TEST STARTING: sessions-page-unique-test.spec.ts');
  console.log('🔍 Test name: sessions page loads uniquely with debugging');
  
  // Add debugging for navigation
  console.log('🔍 Attempting to navigate to /sessions');
  
  try {
    // First try relative URL
    await page.goto('/sessions');
    console.log('✅ Successfully navigated to /sessions');
  } catch (error) {
    console.log('❌ Failed with relative URL, trying absolute URL');
    console.log('Error:', error);
    
    // Fallback to absolute URL
    try {
      await page.goto('http://localhost:8080/sessions');
      console.log('✅ Successfully navigated with absolute URL');
    } catch (absoluteError) {
      console.log('❌ Both relative and absolute URLs failed');
      console.log('Absolute error:', absoluteError);
      throw absoluteError;
    }
  }
  
  // Log the current URL
  const currentUrl = page.url();
  console.log('🔍 Current URL after navigation:', currentUrl);
  
  // Allow time for data loading
  console.log('🔍 Waiting for page to load...');
  await page.waitForTimeout(2000);
  
  // Check that the page loaded
  console.log('🔍 Checking if body is visible...');
  await expect(page.locator('body')).toBeVisible();
  console.log('✅ Body is visible');
  
  // Check for session cards or empty state
  console.log('🔍 Looking for session cards or empty state...');
  const sessionCards = page.locator('[data-testid="session-card"]');
  const emptyState = page.locator('text=No sessions found');
  
  // Count session cards
  const cardCount = await sessionCards.count();
  console.log('🔍 Found', cardCount, 'session cards');
  
  // Check for empty state
  const emptyStateVisible = await emptyState.isVisible();
  console.log('🔍 Empty state visible:', emptyStateVisible);
  
  // Either session cards exist OR we have an empty state message
  await expect(sessionCards.first().or(emptyState)).toBeVisible();
  console.log('✅ UNIQUE TEST COMPLETED SUCCESSFULLY');
});