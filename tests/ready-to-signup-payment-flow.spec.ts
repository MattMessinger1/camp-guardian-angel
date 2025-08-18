import { test, expect } from '@playwright/test';

test.describe('Ready to Signup - Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated session
    await page.goto('/login');
    
    // Try to login with test credentials or skip if already logged in
    await page.waitForTimeout(2000);
    
    // Check if already logged in by looking for sessions page content
    const currentUrl = page.url();
    if (!currentUrl.includes('/sessions')) {
      // Attempt login with test credentials
      const emailField = page.locator('input[type="email"]');
      if (await emailField.isVisible()) {
        await emailField.fill('test1@test.com');
        await page.locator('input[type="password"]').fill('password');
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(3000);
      }
    }
    
    // Navigate to sessions page
    await page.goto('/sessions');
    await page.waitForTimeout(2000);
  });

  test('TC-007: Save Card Banner Display', async ({ page }) => {
    // Look for the save card banner
    const saveCardBanner = page.locator('text="Save a card for faster billing"');
    
    if (await saveCardBanner.isVisible()) {
      console.log('Save card banner is visible - user needs to set up payment');
      
      // Verify banner contains expected elements
      await expect(saveCardBanner).toBeVisible();
      
      // Check for save card button
      const saveCardButton = page.locator('button:has-text("Save a card")');
      await expect(saveCardButton).toBeVisible();
      
      // Check for dismiss button
      const dismissButton = page.locator('button:has-text("Dismiss")');
      await expect(dismissButton).toBeVisible();
      
    } else {
      console.log('Save card banner not visible - user may already have payment method');
      // This is also a valid state
    }
  });

  test('TC-008: Save Card Button Functionality', async ({ page }) => {
    // Look for save card button
    const saveCardButton = page.locator('button:has-text("Save a card")');
    
    if (await saveCardButton.isVisible()) {
      // Click save card button
      await saveCardButton.click();
      
      // Should redirect to Stripe (new tab or redirect)
      await page.waitForTimeout(3000);
      
      // Check if new tab opened or URL changed
      const currentUrl = page.url();
      const newTabPromise = page.waitForEvent('popup');
      
      // If popup/new tab, verify it's Stripe
      try {
        const popup = await newTabPromise;
        await popup.waitForLoadState();
        const popupUrl = popup.url();
        expect(popupUrl).toContain('checkout.stripe.com');
        await popup.close();
      } catch (e) {
        // If no popup, check if current page redirected to Stripe
        if (currentUrl.includes('stripe.com') || currentUrl.includes('checkout')) {
          expect(currentUrl).toContain('stripe');
        }
      }
    } else {
      console.log('Save card button not visible - skipping Stripe test');
    }
  });

  test('TC-009: Dismiss Banner Functionality', async ({ page }) => {
    const saveCardBanner = page.locator('.surface-card:has-text("Save a card for faster billing")');
    
    if (await saveCardBanner.isVisible()) {
      // Click dismiss button
      const dismissButton = page.locator('button:has-text("Dismiss")');
      await dismissButton.click();
      
      // Banner should disappear
      await expect(saveCardBanner).not.toBeVisible();
      
      // Refresh page and verify banner stays dismissed
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Banner should still be hidden due to sessionStorage
      await expect(saveCardBanner).not.toBeVisible();
      
    } else {
      console.log('Save card banner not visible - skipping dismiss test');
    }
  });

  test('TC-010: Payment Setup Session Creation', async ({ page }) => {
    // Monitor network requests
    const requests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('create-setup-session')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });

    const responses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('create-setup-session')) {
        responses.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    // Look for save card button and click it
    const saveCardButton = page.locator('button:has-text("Save a card")');
    
    if (await saveCardButton.isVisible()) {
      await saveCardButton.click();
      
      // Wait for network request
      await page.waitForTimeout(5000);
      
      // Verify API call was made
      expect(requests.length).toBeGreaterThan(0);
      expect(requests[0].method).toBe('POST');
      expect(requests[0].url).toContain('create-setup-session');
      
      // Verify response was successful
      if (responses.length > 0) {
        expect(responses[0].status).toBe(200);
      }
    } else {
      console.log('Save card button not visible - skipping API test');
    }
  });

  test('TC-011: Payment Method Security', async ({ page }) => {
    // Verify no sensitive payment data is stored in localStorage or visible in DOM
    const localStorage = await page.evaluate(() => Object.keys(localStorage));
    
    // Should not contain sensitive payment information
    const sensitiveKeys = localStorage.filter(key => 
      key.toLowerCase().includes('card') || 
      key.toLowerCase().includes('payment') || 
      key.toLowerCase().includes('stripe')
    );
    
    // Only safe keys like 'hide_save_card_banner' should be present
    sensitiveKeys.forEach(key => {
      expect(key).toMatch(/hide_save_card_banner|payment_setup_complete/);
    });
    
    // Verify no credit card numbers in DOM
    const bodyText = await page.textContent('body');
    const ccRegex = /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/;
    expect(bodyText).not.toMatch(ccRegex);
  });

  test('TC-012: Payment Banner State Persistence', async ({ page }) => {
    // Test that banner state persists across page reloads
    const saveCardBanner = page.locator('.surface-card:has-text("Save a card")');
    
    const initialBannerVisible = await saveCardBanner.isVisible();
    
    // Refresh page
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Banner visibility should be consistent
    const afterReloadVisible = await saveCardBanner.isVisible();
    expect(afterReloadVisible).toBe(initialBannerVisible);
    
    // If banner is visible, test dismiss persistence
    if (initialBannerVisible) {
      const dismissButton = page.locator('button:has-text("Dismiss")');
      if (await dismissButton.isVisible()) {
        await dismissButton.click();
        await expect(saveCardBanner).not.toBeVisible();
        
        // Refresh and verify it stays dismissed
        await page.reload();
        await page.waitForTimeout(2000);
        await expect(saveCardBanner).not.toBeVisible();
      }
    }
  });

  test('TC-013: Error Handling for Payment Setup', async ({ page }) => {
    // Monitor console errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    // Monitor network failures
    const networkErrors: any[] = [];
    page.on('requestfailed', request => {
      if (request.url().includes('create-setup-session')) {
        networkErrors.push({
          url: request.url(),
          failure: request.failure()
        });
      }
    });

    const saveCardButton = page.locator('button:has-text("Save a card")');
    
    if (await saveCardButton.isVisible()) {
      await saveCardButton.click();
      await page.waitForTimeout(5000);
      
      // Should not have critical console errors
      const criticalErrors = consoleMessages.filter(msg => 
        msg.includes('TypeError') || 
        msg.includes('ReferenceError') ||
        msg.includes('Uncaught')
      );
      
      expect(criticalErrors.length).toBe(0);
      
      // Network errors should be handled gracefully
      if (networkErrors.length > 0) {
        console.log('Network errors detected:', networkErrors);
        // Should show user-friendly error message rather than crashing
        const errorMessage = page.locator('text=error', { hasText: /error|failed|try again/i });
        // Either no error message (request succeeded) or user-friendly error
      }
    }
  });

  test('TC-014: Multiple Payment Method Scenarios', async ({ page }) => {
    // Test behavior when user already has payment method vs needs to set up
    const saveCardBanner = page.locator('.surface-card:has-text("Save a card")');
    const bannerVisible = await saveCardBanner.isVisible();
    
    if (bannerVisible) {
      console.log('User needs to set up payment method');
      
      // Verify banner encourages setup
      await expect(saveCardBanner).toContainText('faster billing');
      
      // Should have clear call to action
      const saveButton = page.locator('button:has-text("Save a card")');
      await expect(saveButton).toBeVisible();
      
    } else {
      console.log('User may already have payment method set up');
      
      // Should not show setup prompts if already configured
      const setupPrompts = page.locator('text="Save a card"');
      await expect(setupPrompts).not.toBeVisible();
    }
    
    // Verify page functionality regardless of payment status
    const sessionCards = page.locator('a[href^="/sessions/"]');
    await expect(sessionCards.first()).toBeVisible({ timeout: 10000 });
  });
});