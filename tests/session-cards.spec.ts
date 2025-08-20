import { test, expect } from '@playwright/test';

test('session cards page loads and displays sessions', async ({ page }) => {
  await page.goto('/sessions');
  await page.waitForTimeout(2000); // Allow time for data loading
  
  // Check that the page loaded
  await expect(page.locator('body')).toBeVisible();
  
  // Check for session cards or empty state
  const sessionCards = page.locator('[data-testid="session-card"]');
  const emptyState = page.locator('text=No sessions found');
  
  // Either session cards exist OR we have an empty state message
  await expect(sessionCards.first().or(emptyState)).toBeVisible();
});
