import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Prevent vitest from being loaded by clearing any vitest-related modules
  if (typeof global !== 'undefined') {
    // Clear any vitest globals that might interfere
    delete (global as any).vi;
    delete (global as any).vitest;
    
    // Clear vitest expect extensions
    if ((global as any).Symbol && (global as any).Symbol.for) {
      const jestMatchersSymbol = (global as any).Symbol.for('$$jest-matchers-object');
      try {
        delete (global as any)[jestMatchersSymbol];
      } catch (e) {
        // Ignore if already deleted
      }
    }
  }

  // Clear module cache for vitest-related modules
  const moduleCache = require.cache;
  Object.keys(moduleCache).forEach(key => {
    if (key.includes('@vitest/expect') || 
        key.includes('vitest') || 
        key.includes('@jest/expect')) {
      delete moduleCache[key];
    }
  });

  console.log('✓ Playwright global setup completed - vitest exclusions applied');
}

export default globalSetup;