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
  // webServer disabled - using manual dev server
  // webServer: {
  //   command: 'npm run build && npx serve -s dist -l 4173',
  //   url: 'http://localhost:4173',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 60000,
  //   env: {
  //     NODE_ENV: 'playwright-test',
  //     VITEST: 'false',
  //   }
  // },
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