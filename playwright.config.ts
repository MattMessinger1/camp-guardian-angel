import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',
  
  // Prevent Vitest symbol conflicts
  globalSetup: undefined,
  globalTeardown: undefined,
  
  use: {
    headless: false,
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 60000,
    env: {
      NODE_ENV: 'e2e',
      VITEST: 'false',
      JEST_WORKER_ID: '',
      // Completely block vitest modules
      NODE_OPTIONS: '--no-experimental-loader',
    }
  },
  
  projects: [
    { 
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
      testMatch: 'tests/**/*.spec.ts',
    },
  ],
});