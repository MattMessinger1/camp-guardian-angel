import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  // globalSetup: './tests/playwright-global-setup.ts', // Temporarily disabled for testing
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
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [
    { 
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
      testMatch: '**/*.spec.ts',
      testIgnore: [
        '**/unit/**', 
        '**/node_modules/**',
        '**/src/**/*.{test,spec}.ts', // Exclude vitest unit tests
        '**/*.unit.ts',
        '**/vitest/**',
        '**/vi/**',
        '**/*vitest*'
      ],
    },
  ],
});