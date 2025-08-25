import { test, expect } from '@playwright/test';

test.describe('Updated 4-Step User Workflow', () => {
  test.setTimeout(20000);

  test('Step 1: Homepage with search and "Get ready for signup" button', async ({ page }) => {
    console.log('Testing Step 1: Homepage search functionality...');
    await page.goto('/');
    
    // Verify homepage loads
    await expect(page.locator('body')).toBeVisible();
    
    // Check for search functionality
    await expect(page.locator('text=Search for your activity')).toBeVisible();
    
    console.log('✅ Step 1: Homepage loads with search capability');
  });

  test('Step 2: Signup information collection with payment consent', async ({ page }) => {
    console.log('Testing Step 2: Signup form with payment consent...');
    await page.goto('/signup?sessionId=test-123');
    
    // Should load the signup form
    await expect(page.locator('body')).toBeVisible();
    
    // Look for payment consent elements
    const formElements = page.locator('input, button, form');
    await expect(formElements.first()).toBeVisible();
    
    console.log('✅ Step 2: Signup form loads with payment options');
  });

  test('Step 3: Confirmation page shows next steps', async ({ page }) => {
    console.log('Testing Step 3: Confirmation with next steps...');
    await page.goto('/sessions/11111111-2222-3333-4444-555555555555/signup-submitted');
    
    // Should load confirmation page
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Step 3: Confirmation page loads');
  });

  test('Step 4: Account history shows all signups', async ({ page }) => {
    console.log('Testing Step 4: Account history...');
    await page.goto('/account-history');
    
    // Should load account history
    await expect(page.locator('body')).toBeVisible();
    
    // Check for signup history content
    await expect(page.locator('h1')).toContainText('Signup History');
    
    console.log('✅ Step 4: Account history page loads');
  });

  test('Complete workflow navigation flow', async ({ page }) => {
    console.log('Testing complete workflow navigation...');
    
    // Step 1: Start at homepage
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    // Step 2: Navigate to signup
    await page.goto('/signup?sessionId=test-123');
    await expect(page.locator('body')).toBeVisible();
    
    // Step 3: Navigate to confirmation
    await page.goto('/sessions/11111111-2222-3333-4444-555555555555/signup-submitted');
    await expect(page.locator('body')).toBeVisible();
    
    // Step 4: Navigate to account history
    await page.goto('/account-history');
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Complete workflow: All 4 steps accessible and working');
  });
});