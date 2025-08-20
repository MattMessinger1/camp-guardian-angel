import { Page, Locator, expect } from '@playwright/test';

export interface WaitOptions {
  timeout?: number;
  debugOutput?: boolean;
  retries?: number;
}

/**
 * Smart element waiter with retry logic
 */
export async function waitForElementSmart(
  page: Page, 
  selector: string, 
  options: WaitOptions = {}
): Promise<Locator> {
  const { timeout = 10000, debugOutput = false, retries = 3 } = options;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (debugOutput) {
        console.log(`🔍 Attempt ${attempt}: Looking for ${selector}`);
      }
      
      const element = page.locator(selector);
      await expect(element).toBeVisible({ timeout: timeout / retries });
      
      if (debugOutput) {
        console.log(`✅ Found ${selector}`);
      }
      
      return element;
    } catch (error) {
      if (attempt === retries) {
        if (debugOutput) {
          console.log(`❌ Failed to find ${selector} after ${retries} attempts`);
        }
        throw error;
      }
      
      // Wait before retry
      await page.waitForTimeout(1000);
    }
  }
  
  throw new Error(`Failed to find ${selector}`);
}

/**
 * Wait for any of multiple selectors (whichever appears first)
 */
export async function waitForAnyElement(
  page: Page,
  selectors: string[],
  options: WaitOptions = {}
): Promise<{ element: Locator; selector: string }> {
  const { timeout = 10000, debugOutput = false } = options;
  
  if (debugOutput) {
    console.log(`🔍 Waiting for any of: ${selectors.join(', ')}`);
  }
  
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`None of the selectors found: ${selectors.join(', ')}`));
    }, timeout);
    
    selectors.forEach(selector => {
      waitForElementSmart(page, selector, { timeout: timeout / 2, debugOutput: false })
        .then(element => {
          clearTimeout(timeoutId);
          if (debugOutput) {
            console.log(`✅ Found: ${selector}`);
          }
          resolve({ element, selector });
        })
        .catch(() => {
          // Ignore individual failures, we only care if all fail
        });
    });
  });
}

/**
 * Check if page has data, empty state, or error state
 */
export async function checkPageState(page: Page): Promise<'data' | 'empty' | 'error' | 'loading'> {
  // Check for loading state
  const loadingSelectors = [
    '[data-testid*="loading"]',
    '.loading',
    '[class*="loading"]',
    'text=Loading',
    'text=Please wait'
  ];
  
  for (const selector of loadingSelectors) {
    const element = page.locator(selector);
    if (await element.isVisible()) {
      return 'loading';
    }
  }
  
  // Check for error state
  const errorSelectors = [
    '[data-testid*="error"]',
    '.error',
    'text=Error',
    'text=Failed',
    'text=Something went wrong'
  ];
  
  for (const selector of errorSelectors) {
    const element = page.locator(selector);
    if (await element.isVisible()) {
      return 'error';
    }
  }
  
  // Check for empty state
  const emptySelectors = [
    'text=No sessions',
    'text=No results',
    'text=Coming soon',
    'text=No data',
    '[data-testid*="empty"]'
  ];
  
  for (const selector of emptySelectors) {
    const element = page.locator(selector);
    if (await element.isVisible()) {
      return 'empty';
    }
  }
  
  // Check for data
  const dataSelectors = [
    '[data-testid*="session"]',
    '.session-card',
    '[class*="session"]',
    '[data-testid*="card"]',
    '.card'
  ];
  
  for (const selector of dataSelectors) {
    const elements = page.locator(selector);
    if (await elements.count() > 0) {
      return 'data';
    }
  }
  
  return 'empty';
}

/**
 * Wait for stable page state (no more loading)
 */
export async function waitForStableState(
  page: Page, 
  options: WaitOptions = {}
): Promise<'data' | 'empty' | 'error'> {
  const { timeout = 15000, debugOutput = false } = options;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const state = await checkPageState(page);
    
    if (debugOutput) {
      console.log(`📊 Page state: ${state}`);
    }
    
    if (state !== 'loading') {
      // Wait a bit more to ensure it's truly stable
      await page.waitForTimeout(500);
      const confirmedState = await checkPageState(page);
      
      if (confirmedState === state) {
        return confirmedState;
      }
    }
    
    await page.waitForTimeout(1000);
  }
  
  throw new Error(`Page did not reach stable state within ${timeout}ms`);
}

/**
 * Enhanced text content checker that handles dynamic content
 */
export async function getStableTextContent(page: Page, selector: string): Promise<string | null> {
  let previousText = '';
  let stableCount = 0;
  
  // Check text stability over 3 checks
  for (let i = 0; i < 5; i++) {
    const currentText = await page.locator(selector).textContent();
    
    if (currentText === previousText) {
      stableCount++;
      if (stableCount >= 3) {
        return currentText;
      }
    } else {
      stableCount = 0;
    }
    
    previousText = currentText || '';
    await page.waitForTimeout(200);
  }
  
  return previousText || null;
}