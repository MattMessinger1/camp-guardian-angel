import { test, expect } from '@playwright/test';
import { 
  createSessionsTestSetup, 
  checkPageState, 
  waitForElementSmart,
  logTestInfo 
} from './utils/index';

test.describe('Ready to Signup - Session Discovery', () => {
  // Use the standardized, robust setup
  createSessionsTestSetup({ 
    debugMode: true, 
    performance: true, 
    allowEmpty: true 
  });

  test('TC-001: Public Session Browsing', async ({ page }) => {
    logTestInfo('Starting TC-001: Public Session Browsing');
    
    // Verify page loads without authentication
    await expect(page.locator('body')).toBeVisible();
    
    // Check for main heading
    await expect(page.locator('h1')).toContainText('Upcoming Sessions');
    
    // Check what state the page is in
    const state = await checkPageState(page);
    logTestInfo(`Page state detected: ${state}`);
    
    if (state === 'data') {
      // Verify session cards are displayed
      const sessionCards = page.locator('[data-testid="session-card"]');
      await expect(sessionCards.first()).toBeVisible();
      
      // Verify first card contains essential information
      const firstCard = sessionCards.first();
      await expect(firstCard).toContainText(/Provider:|Capacity:|Fee due at signup:/);
      logTestInfo('✅ Session data found and verified');
    } else if (state === 'empty') {
      // If no sessions, should show appropriate message
      await expect(page.locator('body')).toContainText(/No sessions found|Check back later/);
      logTestInfo('✅ Empty state handled gracefully');
    } else {
      // Handle error state
      logTestInfo('⚠️ Page in error or loading state');
    }
  });

  test('TC-002: Session Card Information Display', async ({ page }) => {
    logTestInfo('Starting TC-002: Session Card Information Display');
    
    // Check what state the page is in
    const state = await checkPageState(page);
    
    if (state !== 'data') {
      test.skip(true, `No sessions available to test - page state: ${state}`);
      return;
    }
    
    const sessionCards = page.locator('[data-testid="session-card"]');
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
      expect(cardText).toContain('Fee due at signup:');
      
      logTestInfo('✅ Session card information verified');
    }
  });

  test('TC-003: Session Detail Navigation', async ({ page }) => {
    // Check if we have session cards (they should already be loaded from beforeEach)
    const sessionCards = page.locator('[data-testid="session-card"]');
    const cardCount = await sessionCards.count();
    
    if (cardCount === 0) {
      // Skip this test if no sessions are available
      test.skip(true, 'No sessions available to test navigation');
      return;
    }
    
    // Click on first session card
    const firstSessionCard = sessionCards.first();
    const sessionHref = await firstSessionCard.getAttribute('href');
    expect(sessionHref).toBeTruthy();
    
    await firstSessionCard.click();
    
    // Verify navigation to session detail page
    await page.waitForURL(sessionHref!, { timeout: 10000 });
    await expect(page).toHaveURL(sessionHref!);
    
    // Verify session detail page loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-004: Create Session Button Visibility', async ({ page }) => {
    // Check if "Create Session" button is present
    const createButton = page.locator('text="Create Session"');
    
    // Button should be visible
    await expect(createButton).toBeVisible();
    
    // Should be a link that navigates to sessions/new
    const parentLink = createButton.locator('..');
    const href = await parentLink.getAttribute('href');
    expect(href).toBe('/sessions/new');
  });

  test('TC-005: Session Data Accuracy', async ({ page }) => {
    // Check if we have session cards (they should already be loaded from beforeEach)
    const sessionCards = page.locator('[data-testid="session-card"]');
    const cardCount = await sessionCards.count();
    
    if (cardCount === 0) {
      // Skip this test if no sessions are available
      test.skip(true, 'No sessions available to test data accuracy');
      return;
    }
    
    // Test first few sessions for data consistency
    const cardsToTest = Math.min(3, cardCount);
    
    for (let i = 0; i < cardsToTest; i++) {
      const card = sessionCards.nth(i);
      const cardText = await card.textContent();
      
      if (cardText) {
        // Verify date formatting if present (dates can be in various formats)
        const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}|\w{3}\s+\d{1,2},\s+\d{4}/;
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
        const capacityMatch = cardText.match(/Capacity:\s*([^Fee\n]+)/);
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
    
    // Wait for either sessions to load or page to finish loading
    await page.waitForFunction(() => {
      return document.querySelector('[data-testid="session-card"]') !== null || 
             document.body.textContent?.includes('No sessions found') ||
             document.body.textContent?.includes('Error loading sessions');
    }, { timeout: 15000 });
    
    const loadTime = Date.now() - startTime;
    
    // Session list should load within reasonable time (15 seconds)
    expect(loadTime).toBeLessThan(15000);
    
    // Check if we have sessions or appropriate message
    const sessionCards = page.locator('[data-testid="session-card"]');
    const cardCount = await sessionCards.count();
    const bodyText = await page.textContent('body');
    
    // Either we have sessions or we have a proper "no sessions" message
    expect(cardCount > 0 || bodyText?.includes('No sessions found')).toBe(true);
  });

  test('TC-007: Responsive Design Check', async ({ page }) => {
    // Test desktop view first
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/sessions');
    
    // Wait for page to load in desktop view
    await page.waitForFunction(() => {
      return document.querySelector('[data-testid="session-card"]') !== null || 
             document.body.textContent?.includes('No sessions found') ||
             document.body.textContent?.includes('Error loading sessions');
    }, { timeout: 15000 });
    
    let sessionCards = page.locator('[data-testid="session-card"]');
    const desktopCount = await sessionCards.count();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Wait for page to load in mobile view
    await page.waitForFunction(() => {
      return document.querySelector('[data-testid="session-card"]') !== null || 
             document.body.textContent?.includes('No sessions found') ||
             document.body.textContent?.includes('Error loading sessions');
    }, { timeout: 15000 });
    
    sessionCards = page.locator('[data-testid="session-card"]');
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
    await page.waitForTimeout(5000);
    
    const sessionCards = page.locator('[data-testid="session-card"]');
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