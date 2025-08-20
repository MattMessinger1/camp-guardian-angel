import { Page, test } from '@playwright/test';
import { setupSessionsPage, setupPaymentPage, setupFormPage, verifyServerHealth } from './pageLoaders';
import { waitForStableState, checkPageState } from './waitHelpers';
import { logTestInfo, measurePerformance } from './debugUtils';

export interface TestSetupOptions {
  skipHealthCheck?: boolean;
  debugMode?: boolean;
  performance?: boolean;
  allowEmpty?: boolean;
}

/**
 * Standard beforeEach setup for session-related tests
 */
export function createSessionsTestSetup(options: TestSetupOptions = {}) {
  return test.beforeEach(async ({ page }) => {
    const { debugMode = false, performance = false, allowEmpty = true } = options;
    
    if (performance) {
      measurePerformance(page, 'sessions-page-load');
    }
    
    if (debugMode) {
      logTestInfo('Setting up sessions page test');
    }
    
    await setupSessionsPage(page, { 
      debugOutput: debugMode, 
      allowEmpty 
    });
    
    if (debugMode) {
      const state = await checkPageState(page);
      logTestInfo(`Page loaded with state: ${state}`);
    }
  });
}

/**
 * Standard beforeEach setup for payment/billing tests
 */
export function createPaymentTestSetup(url: string, options: TestSetupOptions = {}) {
  return test.beforeEach(async ({ page }) => {
    const { debugMode = false, performance = false } = options;
    
    if (performance) {
      measurePerformance(page, 'payment-page-load');
    }
    
    await setupPaymentPage(page, url, { 
      debugOutput: debugMode 
    });
  });
}

/**
 * Standard beforeEach setup for form tests
 */
export function createFormTestSetup(url: string, options: TestSetupOptions = {}) {
  return test.beforeEach(async ({ page }) => {
    const { debugMode = false, performance = false } = options;
    
    if (performance) {
      measurePerformance(page, 'form-page-load');
    }
    
    await setupFormPage(page, url, { 
      debugOutput: debugMode 
    });
  });
}

/**
 * Health check setup - run before all tests
 */
export function createHealthCheckSetup(options: TestSetupOptions = {}) {
  return test.beforeAll(async ({ browser }) => {
    const { skipHealthCheck = false, debugMode = false } = options;
    
    if (skipHealthCheck) return;
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const isHealthy = await verifyServerHealth(page);
    
    if (!isHealthy) {
      throw new Error('Server health check failed - ensure dev server is running');
    }
    
    if (debugMode) {
      logTestInfo('✅ Server health check passed');
    }
    
    await context.close();
  });
}

/**
 * Generic setup function for any page type
 */
export async function setupAnyPage(
  page: Page, 
  url: string, 
  pageType: 'sessions' | 'payment' | 'form' | 'static' = 'static',
  options: TestSetupOptions = {}
) {
  const { debugMode = false, performance = false } = options;
  
  if (performance) {
    measurePerformance(page, `${pageType}-page-load`);
  }
  
  switch (pageType) {
    case 'sessions':
      await setupSessionsPage(page, { debugOutput: debugMode });
      break;
    case 'payment':
      await setupPaymentPage(page, url, { debugOutput: debugMode });
      break;
    case 'form':
      await setupFormPage(page, url, { debugOutput: debugMode });
      break;
    default:
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
  }
}

/**
 * Cleanup function for tests
 */
export function createTestCleanup() {
  return test.afterEach(async ({ page }) => {
    // Add any cleanup logic here
    // For now, just ensure page is closed properly
    if (page && !page.isClosed()) {
      await page.close();
    }
  });
}

/**
 * Retry wrapper for flaky tests
 */
export function withRetry<T>(
  testFn: () => Promise<T>, 
  retries: number = 3, 
  delay: number = 1000
): () => Promise<T> {
  return async () => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await testFn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retries) {
          console.log(`🔄 Test attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  };
}