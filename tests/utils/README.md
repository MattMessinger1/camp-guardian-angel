# Test Utilities Framework

This framework provides reusable, robust testing patterns that handle common issues like React rendering delays, data loading, and flaky network conditions.

## Quick Start

```typescript
import { test, expect } from '@playwright/test';
import { 
  createSessionsTestSetup, 
  waitForElementSmart, 
  checkPageState 
} from './utils';

test.describe('My Test Suite', () => {
  // Use standard setup pattern
  createSessionsTestSetup({ debugMode: true, performance: true });

  test('should handle sessions page reliably', async ({ page }) => {
    // Page is already loaded and stable thanks to setup
    
    // Use smart element waiting
    const sessionCard = await waitForElementSmart(page, '.session-card');
    await expect(sessionCard).toBeVisible();
    
    // Check what state the page is in
    const state = await checkPageState(page);
    console.log(`Page state: ${state}`); // 'data', 'empty', 'error', or 'loading'
  });
});
```

## Core Utilities

### Page Loaders (`pageLoaders.ts`)
- `setupSessionsPage()` - Smart sessions page setup with data waiting
- `setupPaymentPage()` - Payment/billing page setup  
- `setupFormPage()` - Form page setup
- `loadPageWithData()` - Generic page loader with options
- `verifyServerHealth()` - Check if server is responsive

### Element Waiters (`waitHelpers.ts`)
- `waitForElementSmart()` - Robust element waiting with retries
- `waitForAnyElement()` - Wait for any of multiple selectors
- `waitForStableState()` - Wait until page stops loading
- `checkPageState()` - Determine if page has data/empty/error/loading state

### Test Setup (`testSetup.ts`)
- `createSessionsTestSetup()` - Standard beforeEach for session tests
- `createPaymentTestSetup()` - Standard beforeEach for payment tests
- `createFormTestSetup()` - Standard beforeEach for form tests
- `createHealthCheckSetup()` - beforeAll health check
- `withRetry()` - Wrap flaky tests with retry logic

### Debug Utils (`debugUtils.ts`)
- `logTestInfo()` - Timestamped test logging
- `measurePerformance()` - Track page load times
- `debugPageState()` - Detailed page state info
- `captureDebugScreenshot()` - Save debug screenshots
- `monitorNetworkRequests()` - Track network activity

## Standard Patterns

### Session Tests
```typescript
import { createSessionsTestSetup, checkPageState } from './utils';

test.describe('Session Discovery', () => {
  createSessionsTestSetup({ 
    debugMode: true,      // Enable debug logging
    performance: true,    // Track load times
    allowEmpty: true      // Don't fail on empty state
  });

  test('handles both data and empty states', async ({ page }) => {
    const state = await checkPageState(page);
    
    if (state === 'data') {
      // Test with data
      await expect(page.locator('.session-card')).toBeVisible();
    } else if (state === 'empty') {
      // Test empty state
      await expect(page.getByText('No sessions')).toBeVisible();
    }
  });
});
```

### Payment Tests
```typescript
import { createPaymentTestSetup } from './utils';

test.describe('Payment Flow', () => {
  createPaymentTestSetup('/billing', { debugMode: true });

  test('payment form loads', async ({ page }) => {
    // Page already loaded and stable
    await expect(page.getByTestId('payment-form')).toBeVisible();
  });
});
```

### Flaky Test Wrapper
```typescript
import { withRetry, waitForElementSmart } from './utils';

test('flaky test with retry', withRetry(async ({ page }) => {
  await page.goto('/sessions');
  
  // This will retry up to 3 times if it fails
  const element = await waitForElementSmart(page, '.session-card', {
    timeout: 5000,
    retries: 3,
    debugOutput: true
  });
  
  await expect(element).toBeVisible();
}, 3, 2000)); // 3 retries, 2 second delay between
```

## Configuration Options

### PageLoadOptions
```typescript
interface PageLoadOptions {
  timeout?: number;     // Max wait time (default: 10000)
  waitForData?: boolean; // Wait for data loading (default: true)
  allowEmpty?: boolean;  // Don't fail on empty state (default: true)
  debugOutput?: boolean; // Enable debug logging (default: false)
}
```

### TestSetupOptions
```typescript
interface TestSetupOptions {
  skipHealthCheck?: boolean; // Skip server health check
  debugMode?: boolean;       // Enable debug logging
  performance?: boolean;     // Track performance metrics
  allowEmpty?: boolean;      // Allow empty states
}
```

## Best Practices

1. **Always use standard setup functions** - They handle React rendering and data loading
2. **Check page state before assertions** - Use `checkPageState()` to handle empty/error states gracefully
3. **Use smart waiters** - `waitForElementSmart()` is more reliable than basic `waitFor`
4. **Enable debug mode during development** - Get detailed logs and screenshots
5. **Wrap flaky tests** - Use `withRetry()` for network-dependent tests
6. **Monitor performance** - Enable performance tracking to catch slow tests

## Migration Guide

### Before (Fragile)
```typescript
test('old way', async ({ page }) => {
  await page.goto('/sessions');
  await page.waitForTimeout(3000); // Arbitrary wait
  await expect(page.locator('h1')).toBeVisible();
});
```

### After (Robust)
```typescript
import { createSessionsTestSetup, waitForElementSmart } from './utils';

test.describe('New Way', () => {
  createSessionsTestSetup({ debugMode: true });

  test('robust test', async ({ page }) => {
    // Page already loaded and stable
    const heading = await waitForElementSmart(page, 'h1');
    await expect(heading).toBeVisible();
  });
});
```

The framework handles all the complexity of timing, React rendering, data loading, and error states automatically.