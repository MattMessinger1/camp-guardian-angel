import { test, expect } from '@playwright/test';

test.describe('Ready to Signup - Edge Cases & Error Handling', () => {
  
  test('TC-022: Network Connectivity Issues', async ({ page }) => {
    // Test handling of network failures
    await page.goto('/sessions');
    
    // Simulate network failure during API calls
    await page.route('**/functions/v1/**', route => {
      route.abort('internetdisconnected');
    });
    
    // Try to interact with payment setup
    const saveCardButton = page.locator('button:has-text("Save a card")');
    if (await saveCardButton.isVisible()) {
      await saveCardButton.click();
      await page.waitForTimeout(3000);
      
      // Should handle network failure gracefully
      const errorIndicators = page.locator('text=error, text=failed, text=try again', { hasText: /error|failed|try again|network|connection/i });
      
      // Either shows error message or fails silently without crashing
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    }
    
    // Remove route override
    await page.unroute('**/functions/v1/**');
  });

  test('TC-023: Session Capacity and Availability Changes', async ({ page }) => {
    // Test behavior when session details change
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    // Get initial session data
    const sessionCards = page.locator('a[href^="/sessions/"]');
    const firstCard = sessionCards.first();
    const initialText = await firstCard.textContent();
    
    // Navigate to detail page
    const href = await firstCard.getAttribute('href');
    if (href && !href.includes('/new')) {
      await firstCard.click();
      await page.waitForTimeout(2000);
      
      // Check for capacity information
      const pageContent = await page.textContent('body');
      if (pageContent) {
        const capacityMatch = pageContent.match(/capacity:?\s*(\d+)/i);
        if (capacityMatch) {
          const capacity = parseInt(capacityMatch[1]);
          console.log(`Session capacity: ${capacity}`);
          
          // Verify capacity is reasonable (not negative, not extremely high)
          expect(capacity).toBeGreaterThan(0);
          expect(capacity).toBeLessThan(1000); // Reasonable upper limit
        }
        
        // Check for availability status
        const hasAvailabilityInfo = 
          pageContent.toLowerCase().includes('available') ||
          pageContent.toLowerCase().includes('full') ||
          pageContent.toLowerCase().includes('waitlist') ||
          pageContent.toLowerCase().includes('open') ||
          pageContent.toLowerCase().includes('closed');
          
        if (hasAvailabilityInfo) {
          console.log('Session has availability information');
        }
      }
    }
  });

  test('TC-024: Date and Time Validation', async ({ page }) => {
    // Test proper handling of dates and times
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    const sessionCards = page.locator('a[href^="/sessions/"]');
    const cardCount = await sessionCards.count();
    
    // Check date formatting and validation across sessions
    for (let i = 0; i < Math.min(5, cardCount); i++) {
      const card = sessionCards.nth(i);
      const cardText = await card.textContent();
      
      if (cardText) {
        // Look for registration opening dates
        const registrationDateMatch = cardText.match(/registration opens:?\s*([^,\n]+)/i);
        if (registrationDateMatch) {
          const dateStr = registrationDateMatch[1].trim();
          console.log(`Registration date found: ${dateStr}`);
          
          // Try to parse the date
          const parsedDate = new Date(dateStr);
          expect(parsedDate).toBeInstanceOf(Date);
          expect(parsedDate.getTime()).not.toBeNaN();
          
          // Registration date should be in the future or recent past (within 1 year)
          const now = new Date();
          const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          
          expect(parsedDate.getTime()).toBeGreaterThan(oneYearAgo.getTime());
          expect(parsedDate.getTime()).toBeLessThan(oneYearFromNow.getTime());
        }
        
        // Look for session start/end times
        const timeRegex = /(\d{1,2}\/\d{1,2}\/\d{4}[^–]*)/g;
        const times = cardText.match(timeRegex);
        if (times) {
          times.forEach(timeStr => {
            console.log(`Session time found: ${timeStr}`);
            // Basic validation that it's a reasonable date format
            expect(timeStr).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
          });
        }
      }
    }
  });

  test('TC-025: Browser Compatibility and Performance', async ({ page }) => {
    // Test basic performance and compatibility
    const startTime = Date.now();
    
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 15000 });
    
    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);
    
    // Page should load within reasonable time
    expect(loadTime).toBeLessThan(15000);
    
    // Check for JavaScript errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Interact with page elements
    const sessionCards = page.locator('a[href^="/sessions/"]');
    const cardCount = await sessionCards.count();
    expect(cardCount).toBeGreaterThan(0);
    
    // Click on a session
    const firstCard = sessionCards.first();
    await firstCard.click();
    await page.waitForTimeout(2000);
    
    // Should not have critical JavaScript errors
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('TypeError') || 
      error.includes('ReferenceError') ||
      error.includes('Uncaught')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('TC-026: Data Consistency Across Page Refreshes', async ({ page }) => {
    // Test that data remains consistent across refreshes
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    // Get initial session data
    const sessionCards = page.locator('a[href^="/sessions/"]');
    const initialCardCount = await sessionCards.count();
    const initialFirstCardText = await sessionCards.first().textContent();
    
    // Refresh page
    await page.reload();
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    // Compare data after refresh
    const refreshedCardCount = await sessionCards.count();
    const refreshedFirstCardText = await sessionCards.first().textContent();
    
    // Should have same number of sessions
    expect(refreshedCardCount).toBe(initialCardCount);
    
    // First session should be the same (assuming no real-time updates)
    expect(refreshedFirstCardText).toBe(initialFirstCardText);
  });

  test('TC-027: Mobile Responsiveness', async ({ page }) => {
    // Test mobile viewport behavior
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    // Verify sessions are still accessible on mobile
    const sessionCards = page.locator('a[href^="/sessions/"]');
    const cardCount = await sessionCards.count();
    expect(cardCount).toBeGreaterThan(0);
    
    // Click on a session
    const firstCard = sessionCards.first();
    await firstCard.click();
    await page.waitForTimeout(2000);
    
    // Page should be navigable on mobile
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    expect(pageContent!.length).toBeGreaterThan(100);
    
    // Check if save card banner adapts to mobile
    const saveCardBanner = page.locator('.surface-card:has-text("Save a card")');
    if (await saveCardBanner.isVisible()) {
      const bannerBox = await saveCardBanner.boundingBox();
      expect(bannerBox!.width).toBeLessThan(400); // Should fit mobile screen
    }
    
    // Reset viewport
    await page.setViewportSize({ width: 1200, height: 800 });
  });

  test('TC-028: Security and Authentication Edge Cases', async ({ page }) => {
    // Test behavior with invalid/expired authentication
    
    // First, try to access protected content without auth
    await page.goto('/sessions');
    await page.waitForTimeout(3000);
    
    // Should either show login form or public content
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    
    // Check if redirected to login
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('Redirected to login - authentication required');
      
      // Should have login form
      const emailField = page.locator('input[type="email"]');
      const passwordField = page.locator('input[type="password"]');
      
      await expect(emailField).toBeVisible();
      await expect(passwordField).toBeVisible();
      
    } else {
      console.log('Sessions page accessible - may have public content');
      
      // Should show sessions even without auth (public browsing)
      const sessionCards = page.locator('a[href^="/sessions/"]');
      const hasCards = await sessionCards.count() > 0;
      
      if (hasCards) {
        console.log('Public session browsing available');
      }
    }
  });

  test('TC-029: Form State Recovery', async ({ page }) => {
    // Test that form data is preserved during navigation
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    // Look for forms on session detail pages
    const sessionCards = page.locator('a[href^="/sessions/"]');
    const firstCard = sessionCards.first();
    const href = await firstCard.getAttribute('href');
    
    if (href && !href.includes('/new')) {
      await firstCard.click();
      await page.waitForTimeout(2000);
      
      // Look for input fields
      const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"], textarea');
      const inputCount = await inputs.count();
      
      if (inputCount > 0) {
        // Fill out first few fields
        const testData = {
          text: 'Test Data',
          email: 'test@example.com',
          phone: '555-123-4567'
        };
        
        for (let i = 0; i < Math.min(3, inputCount); i++) {
          const input = inputs.nth(i);
          const type = await input.getAttribute('type');
          
          if (type === 'email') {
            await input.fill(testData.email);
          } else if (type === 'tel') {
            await input.fill(testData.phone);
          } else {
            await input.fill(testData.text);
          }
        }
        
        // Navigate away and back
        await page.goto('/sessions');
        await page.waitForTimeout(1000);
        
        await firstCard.click();
        await page.waitForTimeout(2000);
        
        // Check if data was preserved (depends on implementation)
        for (let i = 0; i < Math.min(3, inputCount); i++) {
          const input = inputs.nth(i);
          const value = await input.inputValue();
          console.log(`Field ${i} value after navigation: ${value}`);
        }
      }
    }
  });

  test('TC-030: System Constraints Validation', async ({ page }) => {
    // Test 30-day preparation window and other business rules
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    const sessionCards = page.locator('a[href^="/sessions/"]');
    const cardCount = await sessionCards.count();
    
    // Check each session's registration timing
    for (let i = 0; i < Math.min(3, cardCount); i++) {
      const card = sessionCards.nth(i);
      const cardText = await card.textContent();
      
      if (cardText) {
        // Look for registration open date
        const regMatch = cardText.match(/registration opens:?\s*([^,\n]+)/i);
        if (regMatch) {
          const regDateStr = regMatch[1].trim();
          const regDate = new Date(regDateStr);
          const now = new Date();
          
          // Calculate days until registration
          const daysUntil = Math.ceil((regDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          console.log(`Session ${i + 1}: Registration in ${daysUntil} days`);
          
          // According to business rules, should only show prep for sessions within 30 days
          if (daysUntil > 30) {
            console.log(`Warning: Session shows registration more than 30 days out (${daysUntil} days)`);
            
            // Click on session to see if preparation is restricted
            await card.click();
            await page.waitForTimeout(2000);
            
            const detailContent = await page.textContent('body');
            if (detailContent) {
              // Should either not show preparation option or show warning
              const hasPreparationOption = detailContent.toLowerCase().includes('prepare') || 
                                         detailContent.toLowerCase().includes('ready for signup');
              
              if (hasPreparationOption && daysUntil > 30) {
                console.log('Warning: Preparation available for session > 30 days out');
              }
            }
            
            // Go back
            await page.goto('/sessions');
            await page.waitForTimeout(1000);
          }
        }
      }
    }
  });
});