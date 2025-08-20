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
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  globalTeardown: undefined, // Prevent vitest teardown hooks
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
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