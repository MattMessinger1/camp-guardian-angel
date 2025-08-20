// Playwright-specific setup file
// This file is isolated from Vitest to avoid expect conflicts

import { test as base } from '@playwright/test';

// Export clean Playwright test without any Vitest interference
export const test = base;
export { expect } from '@playwright/test';