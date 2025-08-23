import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  // globalSetup removed - was causing vitest symbol conflicts
  use: {
    headless: false,
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  globalTeardown: undefined, // Prevent vitest teardown hooks
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 60000,
  },
  projects: [
    { 
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
      // Simplified - just match all .spec.ts files in tests folder
      testMatch: 'tests/**/*.spec.ts',
    },
  ],
});