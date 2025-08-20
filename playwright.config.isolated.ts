import { defineConfig } from '@playwright/test';

// Completely isolated Playwright config - no Vitest contamination
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',
  
  // Clean environment - no globalSetup, no teardown
  globalSetup: undefined,
  globalTeardown: undefined,
  
  use: {
    headless: false,
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  
  // Use built app to avoid dev server loading Vitest
  webServer: {
    command: 'npm run build && npm run preview --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  projects: [
    { 
      name: 'chromium-isolated',
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