import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',
  
  // Complete isolation - no global setup, no teardown
  globalSetup: undefined,
  globalTeardown: undefined,
  
  use: {
    headless: false,
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  
  // Use static file server instead of Vite to eliminate all Node module contamination
  webServer: {
    command: 'npm run build && npx serve -s dist -l 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      // Completely isolate from vitest
      NODE_ENV: 'playwright-test',
      VITEST: 'false',
      JEST_WORKER_ID: undefined,
      NODE_OPTIONS: '--no-experimental-loader'
    }
  },
  
  projects: [
    { 
      name: 'chromium-clean',
      use: {
        browserName: 'chromium',
      },
      testMatch: '**/*.spec.ts',
      testIgnore: [
        '**/unit/**',
        '**/node_modules/**',
        '**/src/**/*.{test,spec}.ts',
        '**/*.unit.ts',
        '**/vitest/**',
        '**/vi/**',
        '**/*vitest*',
        '**/*jest*'
      ],
    },
  ],
});