import { Page, expect } from '@playwright/test';

export interface PageLoadOptions {
  timeout?: number;
  waitForData?: boolean;
  allowEmpty?: boolean;
  debugOutput?: boolean;
}

/**
 * Smart page loader that waits for React rendering and data loading
 */
export async function loadPageWithData(
  page: Page, 
  url: string, 
  options: PageLoadOptions = {}
) {
  const { 
    timeout = 10000, 
    waitForData = true, 
    allowEmpty = true, 
    debugOutput = false 
  } = options;

  if (debugOutput) {
    console.log(`🔄 Loading page: ${url}`);
  }

  await page.goto(url);
  
  // Wait for React app to initialize
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000); // Allow React hydration

  if (waitForData) {
    await waitForDataOrState(page, { timeout, allowEmpty, debugOutput });
  }

  if (debugOutput) {
    const bodyText = await page.textContent('body');
    console.log(`📄 Page content preview: ${bodyText?.substring(0, 100)}...`);
  }
}

/**
 * Wait for either data to load or a stable empty/error state
 */
export async function waitForDataOrState(
  page: Page, 
  options: { timeout?: number; allowEmpty?: boolean; debugOutput?: boolean } = {}
) {
  const { timeout = 10000, allowEmpty = true, debugOutput = false } = options;

  try {
    await page.waitForFunction(
      () => {
        // Check for loading indicators
        const loadingElements = document.querySelectorAll('[data-testid*="loading"], .loading, [class*="loading"]');
        const hasLoading = loadingElements.length > 0 && 
          Array.from(loadingElements).some(el => el.textContent?.includes('Loading'));
        
        if (hasLoading) return false;

        // Check for content or stable states
        const hasContent = document.querySelectorAll('[data-testid*="session"], .session-card, [class*="session"]').length > 0;
        const hasEmptyMessage = document.textContent?.includes('No sessions') || 
                               document.textContent?.includes('No results') ||
                               document.textContent?.includes('Coming soon');
        const hasError = document.textContent?.includes('Error') || 
                        document.textContent?.includes('failed');

        return hasContent || hasEmptyMessage || hasError;
      },
      { timeout }
    );
  } catch (error) {
    if (debugOutput) {
      console.log('⚠️ Timeout waiting for data state, proceeding with current state');
    }
    if (!allowEmpty) {
      throw error;
    }
  }
}

/**
 * Setup for sessions page specifically
 */
export async function setupSessionsPage(page: Page, options: PageLoadOptions = {}) {
  await loadPageWithData(page, '/sessions', {
    timeout: 15000,
    waitForData: true,
    allowEmpty: true,
    ...options
  });

  // Wait for main heading
  await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
}

/**
 * Setup for payment/billing pages
 */
export async function setupPaymentPage(page: Page, url: string, options: PageLoadOptions = {}) {
  await loadPageWithData(page, url, {
    timeout: 10000,
    waitForData: false, // Payment pages might not have dynamic data
    ...options
  });
}

/**
 * Setup for form pages (reservation, signup, etc.)
 */
export async function setupFormPage(page: Page, url: string, options: PageLoadOptions = {}) {
  await loadPageWithData(page, url, {
    timeout: 8000,
    waitForData: false,
    ...options
  });
}

/**
 * Health check - verify server is responsive
 */
export async function verifyServerHealth(page: Page): Promise<boolean> {
  try {
    const response = await page.goto('/');
    return response?.status() === 200;
  } catch {
    return false;
  }
}