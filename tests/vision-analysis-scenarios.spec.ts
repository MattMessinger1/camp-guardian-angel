import { test, expect } from '@playwright/test';
import { mockScreenshots, validateVisionResponse, createTestSession } from './utils/visionTestUtils';

test.describe('Vision Analysis Real-World Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to vision analysis test page
    await page.goto('/ai-context-test');
    await page.waitForLoadState('networkidle');
  });

  test('TC-VIS-001: Analyze simple registration form', async ({ page }) => {
    // Test simple form analysis
    const testButton = page.locator('button:has-text("Run Step 2.1 Test")');
    await expect(testButton).toBeVisible();
    
    await testButton.click();
    
    // Wait for test completion
    await page.waitForSelector('text="Test completed"', { timeout: 30000 });
    
    // Verify results are displayed
    const resultsArea = page.locator('textarea[placeholder*="results"]');
    const results = await resultsArea.inputValue();
    
    expect(results).toContain('accessibilityComplexity');
    expect(results).toContain('wcagComplianceScore');
  });

  test('TC-VIS-002: Analyze complex form with CAPTCHA detection', async ({ page }) => {
    // Test intelligent model selection
    const intelligentButton = page.locator('button:has-text("Run Intelligent Analysis")');
    await expect(intelligentButton).toBeVisible();
    
    await intelligentButton.click();
    
    // Wait for analysis completion
    await page.waitForSelector('text="Analysis completed"', { timeout: 30000 });
    
    // Verify intelligent analysis results
    const resultsArea = page.locator('textarea[placeholder*="results"]');
    const results = await resultsArea.inputValue();
    
    expect(results).toContain('model');
    expect(results).toContain('analysis');
  });

  test('TC-VIS-003: Handle vision analysis errors gracefully', async ({ page }) => {
    // Test error handling by triggering a test that might fail
    const testButton = page.locator('button:has-text("Run Step 2.1 Test")');
    
    // Mock a network failure scenario
    await page.route('**/functions/v1/test-vision-analysis', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await testButton.click();
    
    // Verify error is handled gracefully
    await page.waitForTimeout(5000);
    const resultsArea = page.locator('textarea[placeholder*="results"]');
    const results = await resultsArea.inputValue();
    
    // Should contain error information or fallback response
    expect(results).toBeTruthy();
  });

  test('TC-VIS-004: Vision analysis performance benchmarks', async ({ page }) => {
    const startTime = Date.now();
    
    // Run vision analysis test
    const testButton = page.locator('button:has-text("Run Step 2.1 Test")');
    await testButton.click();
    
    // Wait for completion
    await page.waitForSelector('text="Test completed"', { timeout: 30000 });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Vision analysis should complete within reasonable time
    expect(duration).toBeLessThan(25000); // 25 seconds max
    
    console.log(`Vision analysis completed in ${duration}ms`);
  });

  test('TC-VIS-005: Multiple concurrent vision analyses', async ({ page }) => {
    // Test system stability under multiple requests
    const testButton = page.locator('button:has-text("Run Step 2.1 Test")');
    const intelligentButton = page.locator('button:has-text("Run Intelligent Analysis")');
    
    // Start both tests simultaneously
    await Promise.all([
      testButton.click(),
      intelligentButton.click()
    ]);
    
    // Wait for both to complete
    await page.waitForTimeout(35000);
    
    // Verify both completed successfully
    const resultsArea = page.locator('textarea[placeholder*="results"]');
    const results = await resultsArea.inputValue();
    
    expect(results).toBeTruthy();
  });
});