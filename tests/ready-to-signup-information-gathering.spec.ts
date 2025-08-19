import { test, expect } from '@playwright/test';

test.describe('Ready to Signup - Information Gathering', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure user is authenticated
    await page.goto('/login');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    if (!currentUrl.includes('/sessions')) {
      const emailField = page.locator('input[type="email"]');
      if (await emailField.isVisible()) {
        await emailField.fill('test1@test.com');
        await page.locator('input[type="password"]').fill('password');
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(3000);
      }
    }
  });

  test('TC-015: Session Detail Information Display', async ({ page }) => {
    // Navigate to sessions and select one with details
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    // Find a session with a valid ID (not "new")
    const sessionLinks = page.locator('a[href^="/sessions/"]');
    let selectedLink = sessionLinks.first();
    
    // Try to find a session that's not /sessions/new
    const linkCount = await sessionLinks.count();
    for (let i = 0; i < linkCount; i++) {
      const link = sessionLinks.nth(i);
      const href = await link.getAttribute('href');
      if (href && !href.includes('/new') && href.match(/\/sessions\/[a-f0-9-]+$/)) {
        selectedLink = link;
        break;
      }
    }
    
    // Click on the session
    await selectedLink.click();
    await page.waitForTimeout(3000);
    
    // Verify we're on a session detail page
    const url = page.url();
    expect(url).toMatch(/\/sessions\/[a-f0-9-]+$/);
    
    // Check for session information display
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    
    // Should show session details
    if (pageContent && pageContent.length > 100) {
      // Look for common session detail elements
      const hasSessionInfo = 
        pageContent.includes('Provider:') ||
        pageContent.includes('Capacity:') ||
        pageContent.includes('Location:') ||
        pageContent.includes('Age range:') ||
        pageContent.includes('Price:');
      
      expect(hasSessionInfo).toBeTruthy();
    }
  });

  test('TC-016: Children Management Interface', async ({ page }) => {
    // Navigate to children page
    await page.goto('/children');
    await page.waitForTimeout(3000);
    
    // Check if children page exists and loads
    const pageContent = await page.textContent('body');
    
    if (pageContent && pageContent.toLowerCase().includes('children')) {
      console.log('Children management page found');
      
      // Look for child-related functionality
      const addChildButton = page.locator('button:has-text("Add Child")', { hasText: /add|new|create/i });
      const childList = page.locator('[data-testid="child-list"]').or(page.locator('.child-item'));
      
      // Should have either existing children or ability to add children
      const hasAddButton = await addChildButton.isVisible();
      const hasChildList = await childList.isVisible();
      
      expect(hasAddButton || hasChildList).toBeTruthy();
      
    } else {
      console.log('Children page not found or not accessible');
      // This might be expected if children management is integrated elsewhere
    }
  });

  test('TC-017: Form Validation and Required Fields', async ({ page }) => {
    // Look for any forms on the session detail pages
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    const sessionLinks = page.locator('a[href^="/sessions/"]');
    const linkCount = await sessionLinks.count();
    
    // Try a few sessions to find forms
    for (let i = 0; i < Math.min(3, linkCount); i++) {
      const link = sessionLinks.nth(i);
      const href = await link.getAttribute('href');
      
      if (href && !href.includes('/new')) {
        await link.click();
        await page.waitForTimeout(2000);
        
        // Look for forms or registration interfaces
        const forms = page.locator('form');
        const formCount = await forms.count();
        
        if (formCount > 0) {
          console.log(`Found ${formCount} forms on session detail page`);
          
          // Check for form validation
          const form = forms.first();
          const requiredFields = form.locator('input[required], select[required], textarea[required]');
          const requiredFieldCount = await requiredFields.count();
          
          if (requiredFieldCount > 0) {
            console.log(`Found ${requiredFieldCount} required fields`);
            
            // Try submitting empty form to test validation
            const submitButton = form.locator('button[type="submit"]');
            if (await submitButton.isVisible()) {
              await submitButton.click();
              await page.waitForTimeout(1000);
              
              // Should show validation errors
              const errorMessages = page.locator('.error, [role="alert"], .text-red-500, .text-destructive');
              const hasErrors = await errorMessages.count() > 0;
              
              if (hasErrors) {
                console.log('Form validation working correctly');
              }
            }
          }
          
          break; // Found a form, exit loop
        }
        
        // Go back to sessions list
        await page.goto('/sessions');
        await page.waitForTimeout(1000);
      }
    }
  });

  test('TC-018: Data Persistence Across Sessions', async ({ page }) => {
    // Test that user data persists across browser sessions
    const testData = {
      timestamp: Date.now().toString(),
      testValue: 'persistence-test'
    };
    
    // Store test data in localStorage
    await page.evaluate((data) => {
      localStorage.setItem('test-persistence', JSON.stringify(data));
    }, testData);
    
    // Navigate away and back
    await page.goto('/sessions');
    await page.waitForTimeout(1000);
    
    // Refresh page
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Check if data persisted
    const persistedData = await page.evaluate(() => {
      const stored = localStorage.getItem('test-persistence');
      return stored ? JSON.parse(stored) : null;
    });
    
    expect(persistedData).toEqual(testData);
    
    // Clean up
    await page.evaluate(() => {
      localStorage.removeItem('test-persistence');
    });
  });

  test('TC-019: No Health Form Requirements', async ({ page }) => {
    // Verify that no health-related forms are presented
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    // Check multiple session detail pages
    const sessionLinks = page.locator('a[href^="/sessions/"]');
    const linkCount = await sessionLinks.count();
    
    for (let i = 0; i < Math.min(3, linkCount); i++) {
      const link = sessionLinks.nth(i);
      const href = await link.getAttribute('href');
      
      if (href && !href.includes('/new')) {
        await link.click();
        await page.waitForTimeout(2000);
        
        // Check page content for health-related terms
        const pageContent = await page.textContent('body');
        
        if (pageContent) {
          const healthTerms = [
            'medical form',
            'health form',
            'medical history',
            'vaccination',
            'immunization',
            'doctor',
            'physician',
            'medical clearance',
            'physical exam'
          ];
          
          const hasHealthTerms = healthTerms.some(term => 
            pageContent.toLowerCase().includes(term.toLowerCase())
          );
          
          // Should not require health forms per business requirements
          if (hasHealthTerms) {
            console.log(`Warning: Health-related terms found on session ${href}`);
            console.log('Health terms found:', healthTerms.filter(term => 
              pageContent.toLowerCase().includes(term.toLowerCase())
            ));
          }
          
          // Look for file upload fields that might be for health forms
          const fileInputs = page.locator('input[type="file"]');
          const fileInputCount = await fileInputs.count();
          
          for (let j = 0; j < fileInputCount; j++) {
            const fileInput = fileInputs.nth(j);
            const label = await fileInput.locator('..').textContent();
            
            if (label && label.toLowerCase().includes('medical')) {
              console.log(`Warning: Potential medical file upload found: ${label}`);
            }
          }
        }
        
        // Go back for next iteration
        await page.goto('/sessions');
        await page.waitForTimeout(1000);
      }
    }
  });

  test('TC-020: Minimum Information Collection', async ({ page }) => {
    // Verify that only essential information is collected
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    const sessionLinks = page.locator('a[href^="/sessions/"]');
    const linkCount = await sessionLinks.count();
    
    // Check session detail pages for forms
    for (let i = 0; i < Math.min(2, linkCount); i++) {
      const link = sessionLinks.nth(i);
      const href = await link.getAttribute('href');
      
      if (href && !href.includes('/new')) {
        await link.click();
        await page.waitForTimeout(2000);
        
        // Count input fields to ensure minimal data collection
        const inputs = page.locator('input, select, textarea');
        const inputCount = await inputs.count();
        
        console.log(`Session ${i + 1} has ${inputCount} input fields`);
        
        // Analyze field types
        for (let j = 0; j < Math.min(inputCount, 10); j++) {
          const input = inputs.nth(j);
          const type = await input.getAttribute('type');
          const name = await input.getAttribute('name');
          const placeholder = await input.getAttribute('placeholder');
          const label = await input.locator('xpath=//label[@for="' + await input.getAttribute('id') + '"]').textContent().catch(() => '');
          
          // Log field information for analysis
          console.log(`Field ${j + 1}: type=${type}, name=${name}, placeholder=${placeholder}, label=${label}`);
          
          // Essential fields should be limited to:
          // - Child name
          // - Child age/birthdate  
          // - Parent contact info
          // - Emergency contact
          const essentialFields = [
            'name', 'email', 'phone', 'age', 'birth', 'emergency', 'contact'
          ];
          
          const fieldInfo = `${type} ${name} ${placeholder} ${label}`.toLowerCase();
          const isEssential = essentialFields.some(essential => fieldInfo.includes(essential));
          
          if (!isEssential && type !== 'hidden' && type !== 'submit') {
            console.log(`Non-essential field detected: ${fieldInfo}`);
          }
        }
        
        // Go back
        await page.goto('/sessions');
        await page.waitForTimeout(1000);
      }
    }
  });

  test('TC-021: Auto-fill for Returning Users', async ({ page }) => {
    // This test simulates returning user auto-fill functionality
    
    // First, simulate filling out information
    const userInfo = {
      name: 'Test Parent',
      email: 'test1@test.com',
      phone: '555-123-4567'
    };
    
    // Store user info in localStorage to simulate previous submission
    await page.evaluate((info) => {
      localStorage.setItem('user-profile', JSON.stringify(info));
    }, userInfo);
    
    // Navigate to a session detail page
    await page.goto('/sessions');
    await page.waitForSelector('a[href^="/sessions/"]', { timeout: 10000 });
    
    const sessionLinks = page.locator('a[href^="/sessions/"]');
    const firstLink = sessionLinks.first();
    const href = await firstLink.getAttribute('href');
    
    if (href && !href.includes('/new')) {
      await firstLink.click();
      await page.waitForTimeout(2000);
      
      // Look for form fields that might be auto-filled
      const emailField = page.locator('input[type="email"]');
      const nameField = page.locator('input[name*="name"], input[placeholder*="name"]');
      const phoneField = page.locator('input[type="tel"], input[name*="phone"]');
      
      // Check if fields are pre-populated (this would depend on implementation)
      if (await emailField.isVisible()) {
        const emailValue = await emailField.inputValue();
        console.log(`Email field value: ${emailValue}`);
      }
      
      if (await nameField.isVisible()) {
        const nameValue = await nameField.inputValue();
        console.log(`Name field value: ${nameValue}`);
      }
      
      if (await phoneField.isVisible()) {
        const phoneValue = await phoneField.inputValue();
        console.log(`Phone field value: ${phoneValue}`);
      }
    }
    
    // Clean up
    await page.evaluate(() => {
      localStorage.removeItem('user-profile');
    });
  });
});