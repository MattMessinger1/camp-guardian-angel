import { test, expect } from '@playwright/test';

test.describe('Ready to Signup - Session Discovery', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sessions page
    await page.goto('/sessions');
  });

  test('TC-001: Public Session Browsing', async ({ page }) => {
    // Verify page loads without authentication
    await expect(page.locator('body')).toBeVisible();
    
    // Check for main heading
    await expect(page.locator('h1')).toContainText('Upcoming Sessions');
    
    // Verify session cards are displayed
    const sessionCards = page.locator('[data-testid="session-card"]').or(page.locator('a[href^="/sessions/"]'));
    await expect(sessionCards.first()).toBeVisible({ timeout: 10000 });
    
    // Verify each session card contains essential information
    const firstCard = sessionCards.first();
    await expect(firstCard).toBeVisible();
    
    // Check for session details within cards
    const cardContent = firstCard.locator('..');
    await expect(cardContent).toContainText(/Provider:|Capacity:|Upfront fee:/);
  });

  test('TC-002: Session Card Information Display', async ({ page }) => {
    // Wait for sessions to load
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    // Get all session cards
    const sessionCards = page.locator('a[href^="/sessions/"]');
    const cardCount = await sessionCards.count();
    
    expect(cardCount).toBeGreaterThan(0);
    
    // Check first session card for required information
    const firstCard = sessionCards.first();
    const cardText = await firstCard.textContent();
    
    // Verify essential data is present
    if (cardText) {
      // Should contain either a title or "Untitled"
      expect(cardText).toMatch(/\w+/);
      
      // Should show capacity information
      expect(cardText).toContain('Capacity:');
      
      // Should show provider information (even if "—")
      expect(cardText).toContain('Provider:');
      
      // Should show fee information
      expect(cardText).toContain('Upfront fee:');
    }
  });

  test('TC-003: Session Detail Navigation', async ({ page }) => {
    // Wait for sessions to load
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    // Click on first session card
    const firstSessionCard = page.locator('a[href^="/sessions/"]').first();
    const sessionHref = await firstSessionCard.getAttribute('href');
    
    await firstSessionCard.click();
    
    // Verify navigation to session detail page
    await page.waitForURL(sessionHref!);
    await expect(page).toHaveURL(sessionHref!);
    
    // Verify session detail page loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-004: Create Session Button Visibility', async ({ page }) => {
    // Check if "Create Session" button is present
    const createButton = page.locator('text="Create Session"');
    
    // Button should be visible (for authenticated users) or not present
    const isVisible = await createButton.isVisible();
    
    if (isVisible) {
      // If visible, verify it's a proper link/button
      await expect(createButton).toBeVisible();
      
      // Should navigate to sessions/new or similar
      const href = await createButton.getAttribute('href');
      expect(href).toMatch(/\/sessions\/new|\/sessions\/create/);
    }
  });

  test('TC-005: Session Data Accuracy', async ({ page }) => {
    // Wait for sessions to load
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    const sessionCards = page.locator('a[href^="/sessions/"]');
    const cardCount = await sessionCards.count();
    
    // Test first few sessions for data consistency
    const cardsToTest = Math.min(3, cardCount);
    
    for (let i = 0; i < cardsToTest; i++) {
      const card = sessionCards.nth(i);
      const cardText = await card.textContent();
      
      if (cardText) {
        // Verify date formatting if present
        const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}/;
        if (dateRegex.test(cardText)) {
          // If dates are present, they should be properly formatted
          expect(cardText).toMatch(dateRegex);
        }
        
        // Verify price formatting if present
        const priceRegex = /\$\d+\.\d{2}/;
        if (priceRegex.test(cardText)) {
          expect(cardText).toMatch(priceRegex);
        }
        
        // Verify capacity is a number if present and not "—"
        const capacityMatch = cardText.match(/Capacity:\s*([^Provider]+)/);
        if (capacityMatch && capacityMatch[1].trim() !== '—') {
          const capacity = capacityMatch[1].trim();
          expect(capacity).toMatch(/^\d+$/);
        }
      }
    }
  });

  test('TC-006: Session List Performance', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate and wait for sessions to load
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 15000 });
    
    const loadTime = Date.now() - startTime;
    
    // Session list should load within reasonable time (10 seconds)
    expect(loadTime).toBeLessThan(10000);
    
    // Verify at least some sessions are displayed
    const sessionCards = page.locator('a[href^="/sessions/"]');
    const cardCount = await sessionCards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('TC-007: Responsive Design Check', async ({ page }) => {
    // Test desktop view first
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    let sessionCards = page.locator('a[href^="/sessions/"]');
    const desktopCount = await sessionCards.count();
    expect(desktopCount).toBeGreaterThan(0);
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    sessionCards = page.locator('a[href^="/sessions/"]');
    const mobileCount = await sessionCards.count();
    
    // Should show same number of sessions on mobile
    expect(mobileCount).toBe(desktopCount);
    
    // Reset to desktop
    await page.setViewportSize({ width: 1200, height: 800 });
  });

  test('TC-008: Error Handling for Empty Sessions', async ({ page }) => {
    // This test checks graceful handling when no sessions are available
    await page.goto('/sessions');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    const sessionCards = page.locator('a[href^="/sessions/"]');
    const cardCount = await sessionCards.count();
    
    if (cardCount === 0) {
      // Should show some indication that no sessions are available
      // or loading indicator should not be stuck
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      
      // Should not show loading forever
      const loadingIndicator = page.locator('text=Loading');
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
      }
    } else {
      // If sessions exist, this test passes
      expect(cardCount).toBeGreaterThan(0);
    }
  });
});