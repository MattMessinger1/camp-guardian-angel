// Global setup for Playwright to prevent Vitest/Jest contamination
// This runs once before all tests to ensure clean environment

async function globalSetup() {
  // Clear any existing expect matchers that might conflict
  if (global.expect) {
    delete global.expect;
  }
  
  // Prevent any Jest/Vitest globals from being loaded
  if (global.test) {
    delete global.test;
  }
  
  if (global.describe) {
    delete global.describe;
  }
  
  // Ensure clean module cache
  if (require.cache) {
    Object.keys(require.cache).forEach(key => {
      if (key.includes('@testing-library') || key.includes('vitest') || key.includes('jest')) {
        delete require.cache[key];
      }
    });
  }
  
  console.log('🧪 Playwright global setup complete - environment isolated');
  
  return async () => {
    console.log('🧪 Playwright global teardown complete');
  };
}

export default globalSetup;