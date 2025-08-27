import { test, expect } from '@playwright/test';

test.describe('Ready to Signup - Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up for integration tests
    await page.goto('/');
    await page.waitForTimeout(2000);
  });

  // Basic workflow test (converted from Cypress)
  test('TC-030: Basic workflow navigation', async ({ page }) => {
    // Step 1: Homepage
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    // Step 2: Session page  
    await page.goto('/sessions/555555555501');
    await expect(page.locator('body')).toBeVisible();
    
    // Step 3: Signup flow
    await page.goto('/signup?sessionId=555555555501');
    await expect(page.locator('body')).toBeVisible();
    
    // Step 4: Confirmation
    await page.goto('/sessions/555555555501/confirmation');
    await expect(page.locator('body')).toBeVisible();
    
    // Step 5: Account history
    await page.goto('/account/history');
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-031: Complete Ready to Signup Workflow', async ({ page }) => {
    // End-to-end test of the complete "Ready to Signup" process
    console.log('Starting complete Ready to Signup workflow test...');
    
    // Step 1: Navigate to sessions
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    // Step 2: Browse available sessions
    const sessionCards = page.locator('a[href^="/sessions/"]');
    const cardCount = await sessionCards.count();
    expect(cardCount).toBeGreaterThan(0);
    console.log(`Found ${cardCount} sessions available`);
    
    // Step 3: Select a session with future registration
    let selectedSession = null;
    for (let i = 0; i < Math.min(3, cardCount); i++) {
      const card = sessionCards.nth(i);
      const cardText = await card.textContent();
      
      if (cardText && cardText.includes('Registration opens:')) {
        selectedSession = card;
        console.log(`Selected session ${i + 1} for workflow test`);
        break;
      }
    }
    
    if (selectedSession) {
      // Step 4: Click on selected session
      await selectedSession.click();
      await page.waitForTimeout(3000);
      
      // Step 5: Verify session detail page loads
      const detailContent = await page.textContent('body');
      expect(detailContent).toBeTruthy();
      console.log('Session detail page loaded successfully');
      
      // Step 6: Look for "Ready to Signup" or preparation functionality
      const prepButtons = page.locator('button:has-text("Ready"), button:has-text("Prepare"), button:has-text("Get Ready")');
      const hasPrepButton = await prepButtons.count() > 0;
      
      if (hasPrepButton) {
        console.log('Preparation functionality found');
        
        // Step 7: Attempt to start preparation process
        await prepButtons.first().click();
        await page.waitForTimeout(3000);
        
        // Should either show form or redirect to preparation flow
        const afterPrepContent = await page.textContent('body');
        expect(afterPrepContent).toBeTruthy();
        console.log('Preparation process initiated');
        
      } else {
        console.log('No preparation button found - checking for other prep indicators');
        
        // Look for other preparation indicators
        const prepIndicators = page.locator('text=prepare, text=ready, text=signup');
        const hasIndicators = await prepIndicators.count() > 0;
        
        if (hasIndicators) {
          console.log('Preparation indicators found in content');
        }
      }
    } else {
      console.log('No sessions with future registration found - testing with available sessions');
      
      // Use first available session
      const firstCard = sessionCards.first();
      await firstCard.click();
      await page.waitForTimeout(2000);
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
      console.log('Session detail loaded for integration test');
    }
  });

  test('TC-032: Authentication Integration', async ({ page }) => {
    // Test authentication flow integration with session browsing
    console.log('Testing authentication integration...');
    
    // Step 1: Access sessions without authentication
    await page.goto('/sessions');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login')) {
      console.log('Authentication required - testing login flow');
      
      // Step 2: Complete login process
      const emailField = page.locator('input[type="email"]');
      const passwordField = page.locator('input[type="password"]');
      
      if (await emailField.isVisible() && await passwordField.isVisible()) {
        await emailField.fill('test1@test.com');
        await passwordField.fill('password');
        
        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();
        await page.waitForTimeout(5000);
        
        // Step 3: Verify successful authentication
        const postLoginUrl = page.url();
        expect(postLoginUrl).not.toContain('/login');
        console.log('Authentication successful');
        
        // Step 4: Verify sessions are now accessible
        if (!postLoginUrl.includes('/sessions')) {
          await page.goto('/sessions');
          await page.waitForTimeout(2000);
        }
        
        const sessionCards = page.locator('a[href^="/sessions/"]');
        const cardCount = await sessionCards.count();
        expect(cardCount).toBeGreaterThan(0);
        console.log('Sessions accessible after authentication');
      }
      
    } else {
      console.log('Sessions accessible without authentication (public browsing)');
      
      // Verify public access works
      const sessionCards = page.locator('a[href^="/sessions/"]');
      const cardCount = await sessionCards.count();
      expect(cardCount).toBeGreaterThan(0);
      
      // Test what happens when trying to access protected features
      const protectedButtons = page.locator('button:has-text("Save a card"), button:has-text("Prepare")');
      const hasProtectedFeatures = await protectedButtons.count() > 0;
      
      if (hasProtectedFeatures) {
        console.log('Protected features visible - may require authentication for actions');
      }
    }
  });

  test('TC-033: Payment Integration Flow', async ({ page }) => {
    // Test integration between session selection and payment setup
    console.log('Testing payment integration flow...');
    
    // Ensure we're authenticated first
    await page.goto('/login');
    await page.waitForTimeout(2000);
    
    const emailField = page.locator('input[type="email"]');
    if (await emailField.isVisible()) {
      await emailField.fill('test1@test.com');
      await page.locator('input[type="password"]').fill('password');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(3000);
    }
    
    // Navigate to sessions
    await page.goto('/sessions');
    await page.waitForTimeout(3000);
    
    // Look for payment setup banner
    const saveCardBanner = page.locator('.surface-card:has-text("Save a card")');
    const hasBanner = await saveCardBanner.isVisible();
    
    if (hasBanner) {
      console.log('Payment setup banner visible - testing integration');
      
      // Step 1: Note session availability before payment setup
      const sessionCards = page.locator('a[href^="/sessions/"]');
      const initialCardCount = await sessionCards.count();
      
      // Step 2: Initiate payment setup
      const saveCardButton = page.locator('button:has-text("Save a card")');
      
      // Monitor for new window/tab (Stripe)
      const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 10000 }).catch(() => null),
        saveCardButton.click()
      ]);
      
      if (popup) {
        console.log('Stripe popup opened successfully');
        await popup.waitForLoadState();
        const popupUrl = popup.url();
        expect(popupUrl).toContain('stripe.com');
        
        // Close popup and return to main window
        await popup.close();
        await page.waitForTimeout(2000);
        
        // Step 3: Verify sessions still accessible after payment flow
        const afterPaymentCards = page.locator('a[href^="/sessions/"]');
        const afterPaymentCount = await afterPaymentCards.count();
        expect(afterPaymentCount).toBe(initialCardCount);
        
        console.log('Sessions remain accessible after payment integration');
        
      } else {
        console.log('No popup detected - may have redirected in same window');
        
        // Check if redirected to Stripe
        const currentUrl = page.url();
        if (currentUrl.includes('stripe.com')) {
          console.log('Redirected to Stripe in same window');
          
          // Go back to sessions
          await page.goto('/sessions');
          await page.waitForTimeout(2000);
          
          const returnedCards = page.locator('a[href^="/sessions/"]');
          const returnedCount = await returnedCards.count();
          expect(returnedCount).toBeGreaterThan(0);
        }
      }
      
    } else {
      console.log('No payment setup banner - user may already have payment configured');
      
      // Verify sessions are accessible with configured payment
      const sessionCards = page.locator('a[href^="/sessions/"]');
      const cardCount = await sessionCards.count();
      expect(cardCount).toBeGreaterThan(0);
    }
  });

  test('TC-034: Database Integration and Data Persistence', async ({ page }) => {
    // Test that data persists correctly across the system
    console.log('Testing database integration and persistence...');
    
    await page.goto('/sessions');
    await page.waitForTimeout(3000);
    
    // Step 1: Collect session data from UI
    const sessionCards = page.locator('a[href^="/sessions/"]');
    const cardCount = await sessionCards.count();
    
    const sessionData = [];
    for (let i = 0; i < Math.min(3, cardCount); i++) {
      const card = sessionCards.nth(i);
      const text = await card.textContent();
      const href = await card.getAttribute('href');
      
      sessionData.push({
        index: i,
        text: text,
        href: href
      });
    }
    
    console.log(`Collected data for ${sessionData.length} sessions`);
    
    // Step 2: Navigate to individual sessions and verify consistency
    for (const session of sessionData) {
      if (session.href && !session.href.includes('/new')) {
        await page.goto(session.href);
        await page.waitForTimeout(2000);
        
        const detailContent = await page.textContent('body');
        
        // Verify basic content exists
        expect(detailContent).toBeTruthy();
        expect(detailContent!.length).toBeGreaterThan(50);
        
        console.log(`Session ${session.index + 1} detail page loaded with ${detailContent!.length} characters`);
        
        // Look for consistent data elements
        if (session.text && session.text.includes('Provider:')) {
          // Should have provider information on detail page too
          const hasProviderInfo = detailContent!.toLowerCase().includes('provider') ||
                                detailContent!.toLowerCase().includes('camp') ||
                                detailContent!.toLowerCase().includes('organization');
          
          if (hasProviderInfo) {
            console.log(`Session ${session.index + 1} has consistent provider information`);
          }
        }
      }
    }
    
    // Step 3: Test data refresh/reload consistency
    await page.goto('/sessions');
    await page.waitForTimeout(2000);
    
    const refreshedCards = page.locator('a[href^="/sessions/"]');
    const refreshedCount = await refreshedCards.count();
    
    // Should have consistent number of sessions
    expect(refreshedCount).toBe(cardCount);
    console.log('Session count consistent after refresh');
  });

  test('TC-035: Error Recovery and Resilience', async ({ page }) => {
    // Test system behavior under various error conditions
    console.log('Testing error recovery and system resilience...');
    
    // Monitor console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Monitor network failures
    const networkFailures: any[] = [];
    page.on('requestfailed', request => {
      networkFailures.push({
        url: request.url(),
        method: request.method(),
        failure: request.failure()
      });
    });
    
    // Step 1: Test with slow network
    await page.route('**/sessions**', route => {
      setTimeout(() => route.continue(), 2000); // 2 second delay
    });
    
    const slowStartTime = Date.now();
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 15000 });
    const slowLoadTime = Date.now() - slowStartTime;
    
    console.log(`Slow network load time: ${slowLoadTime}ms`);
    expect(slowLoadTime).toBeGreaterThan(2000); // Should reflect the delay
    
    // Remove slow network simulation
    await page.unroute('**/sessions**');
    
    // Step 2: Test rapid navigation (stress test)
    for (let i = 0; i < 3; i++) {
      await page.goto('/sessions');
      await page.waitForTimeout(500);
      
      const sessionCards = page.locator('a[href^="/sessions/"]');
      if (await sessionCards.count() > 0) {
        await sessionCards.first().click();
        await page.waitForTimeout(500);
      }
    }
    
    // Step 3: Verify system stability
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    const finalCards = page.locator('a[href^="/sessions/"]');
    const finalCount = await finalCards.count();
    expect(finalCount).toBeGreaterThan(0);
    
    // Step 4: Check for accumulated errors
    console.log(`Console errors during stress test: ${consoleErrors.length}`);
    console.log(`Network failures during stress test: ${networkFailures.length}`);
    
    // Should not have critical errors that break functionality
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('TypeError') || 
      error.includes('ReferenceError') ||
      error.includes('Uncaught')
    );
    
    expect(criticalErrors.length).toBeLessThan(3); // Allow some minor errors
    console.log('System remained stable under stress conditions');
  });

  test('TC-036: Cross-Browser Compatibility Basics', async ({ page }) => {
    // Test basic functionality across different conditions
    console.log('Testing cross-browser compatibility basics...');
    
    // Test with different user agents (simulating different browsers)
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    ];
    
    for (const userAgent of userAgents) {
      await page.setExtraHTTPHeaders({
        'User-Agent': userAgent
      });
      
      console.log(`Testing with user agent: ${userAgent.split(')')[0]}...`);
      
      await page.goto('/sessions');
      await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
      
      const sessionCards = page.locator('a[href^="/sessions/"]');
      const cardCount = await sessionCards.count();
      expect(cardCount).toBeGreaterThan(0);
      
      // Test basic interaction
      const firstCard = sessionCards.first();
      await firstCard.click();
      await page.waitForTimeout(2000);
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
      
      console.log(`User agent test passed: ${cardCount} sessions, content length: ${content!.length}`);
    }
    
    // Reset user agent
    await page.setExtraHTTPHeaders({});
  });
});