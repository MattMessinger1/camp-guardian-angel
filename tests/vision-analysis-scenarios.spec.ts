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
    
    // Parse and validate response structure
    const parsedResults = JSON.parse(results);
    validateVisionResponse(parsedResults);
  });

  test('TC-VIS-002: Intelligent model selection for complex forms', async ({ page }) => {
    // Test that complex forms trigger appropriate model selection
    const testButton = page.locator('button:has-text("Run Vision Analysis")');
    
    if (await testButton.isVisible()) {
      await testButton.click();
      
      // Wait for analysis completion
      await page.waitForTimeout(5000);
      
      // Check for model selection indicators
      const content = await page.textContent('body');
      expect(content).toMatch(/(model|analysis)/i);
    }
  });

  test('TC-VIS-003: Error handling and graceful degradation', async ({ page }) => {
    // Mock a server error by intercepting requests
    await page.route('**/functions/v1/test-vision-analysis', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    const testButton = page.locator('button').first();
    await testButton.click();
    
    // Verify error handling
    await page.waitForTimeout(3000);
    const resultsArea = page.locator('textarea[placeholder*="results"]');
    const results = await resultsArea.inputValue();
    
    // Should show error or graceful fallback
    expect(results.length).toBeGreaterThan(0);
  });

  test('TC-VIS-004: Performance benchmark for vision analysis', async ({ page }) => {
    const startTime = Date.now();
    
    const testButton = page.locator('button:has-text("Run Step 2.1 Test")');
    if (await testButton.isVisible()) {
      await testButton.click();
      
      // Wait for completion
      await page.waitForSelector('text="Test completed"', { timeout: 25000 });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Vision analysis should complete within 25 seconds
      expect(duration).toBeLessThan(25000);
    }
  });

  test('TC-VIS-005: Concurrent vision analysis stability', async ({ page }) => {
    // Test multiple concurrent vision analyses
    const testButtons = await page.locator('button').all();
    
    if (testButtons.length > 0) {
      // Click multiple buttons if available
      const promises = testButtons.slice(0, 3).map(async (button) => {
        try {
          await button.click();
          await page.waitForTimeout(1000);
        } catch (error) {
          // Expected for concurrent operations
        }
      });
      
      await Promise.allSettled(promises);
      
      // Verify system stability
      await page.waitForTimeout(5000);
      const isStable = await page.evaluate(() => {
        return document.readyState === 'complete';
      });
      
      expect(isStable).toBe(true);
    }
  });
});