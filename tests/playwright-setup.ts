// Playwright-specific setup file
// This file is isolated from Vitest to avoid expect conflicts

import { test as base, expect as playwrightExpect } from '@playwright/test';

// Ensure we're using ONLY Playwright's test and expect
// Prevent any contamination from Jest/Vitest globals
const test = base;
const expect = playwrightExpect;

// Clear any global test/expect that might be set by other libraries
if (typeof global !== 'undefined') {
  if (global.expect && global.expect !== playwrightExpect) {
    delete global.expect;
  }
  if (global.test && global.test !== base) {
    delete global.test;
  }
}

// Export clean Playwright test without any Vitest interference
export { test, expect };