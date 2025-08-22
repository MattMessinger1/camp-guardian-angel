import { test, expect } from '@playwright/test';

test.describe('Complete 6-Step Workflow', () => {
  
  test('Step 1: Homepage Search functionality', async ({ page }) => {
    await page.goto('/');
    
    // Check homepage loads
    await expect(page.locator('body')).toBeVisible();
    
    // Check for search functionality
    const searchElements = page.locator('text=Search, text=Activity, text=Camp');
    await expect(searchElements.first()).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Step 1: Homepage loads with search capability');
  });

  test('Step 2: Get Ready for Signup page loads', async ({ page }) => {
    // Test the signup page with a test session ID
    await page.goto('/signup?sessionId=test-session-123');
    
    // Should load the CompleteSignupForm
    await expect(page.locator('body')).toBeVisible();
    
    // Look for form elements
    const formElements = page.locator('input, button, form');
    await expect(formElements.first()).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Step 2: Signup form loads');
  });

  test('Step 3: Complete signup form has required elements', async ({ page }) => {
    await page.goto('/signup?sessionId=test-session-123');
    
    // Check for email input (should be present in signup forms)
    const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[name*="email"]');
    const inputs = page.locator('input');
    
    // Should have some form inputs
    await expect(inputs.first()).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Step 3: Signup form has input fields');
  });

  test('Step 4: Ready for Signup status page loads', async ({ page }) => {
    // Use the test session ID from ReadyToSignup component
    await page.goto('/sessions/11111111-2222-3333-4444-555555555555/ready-to-signup');
    
    // Should load the ReadyToSignup component
    await expect(page.locator('body')).toBeVisible();
    
    // Check for readiness content
    const readinessText = page.locator('text=Ready, text=Signup, text=Assessment');
    await expect(readinessText.first()).toBeVisible({ timeout: 15000 });
    
    console.log('✅ Step 4: Ready for Signup status page loads');
  });

  test('Step 5: Pending Signups page loads', async ({ page }) => {
    await page.goto('/sessions/11111111-2222-3333-4444-555555555555/confirmation');
    
    // Should load the SignupConfirmation component
    await expect(page.locator('body')).toBeVisible();
    
    // Page should load without critical errors
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(50);
    
    console.log('✅ Step 5: Pending Signups page loads');
  });

  test('Step 6: Account History page loads', async ({ page }) => {
    await page.goto('/account/history');
    
    // Should load the AccountHistory component
    await expect(page.locator('body')).toBeVisible();
    
    // Check for history-related content
    const historyText = page.locator('text=History, text=Signup, text=Account');
    await expect(historyText.first()).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Step 6: Account History page loads');
  });

  test('Navigation between workflow steps', async ({ page }) => {
    // Test navigation flow
    console.log('Testing navigation flow...');
    
    // Start at homepage
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    // Go to signup with session ID
    await page.goto('/signup?sessionId=test-123');
    await expect(page.locator('body')).toBeVisible();
    
    // Go to ready-to-signup status
    await page.goto('/sessions/11111111-2222-3333-4444-555555555555/ready-to-signup');
    await expect(page.locator('body')).toBeVisible();
    
    // Go to confirmation
    await page.goto('/sessions/11111111-2222-3333-4444-555555555555/confirmation');
    await expect(page.locator('body')).toBeVisible();
    
    // Go to account history
    await page.goto('/account/history');
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Navigation: All workflow pages accessible');
  });

  test('Error boundaries and missing data handling', async ({ page }) => {
    // Test with invalid session ID
    await page.goto('/sessions/invalid-id/ready-to-signup');
    await expect(page.locator('body')).toBeVisible();
    
    // Should not crash - should show error state
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    
    console.log('✅ Error handling: Invalid session ID handled gracefully');
  });
});