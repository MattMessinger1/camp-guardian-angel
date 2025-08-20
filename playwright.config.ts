import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000, // 1 minute for individual tests
  expect: { timeout: 10_000 },
  use: {
    headless: false, // Force headed mode for debugging
  },
  // Minimal config - no global setup, no web server, no base URL
  projects: [
    { 
      name: 'chromium', 
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome' // Use system Chrome
      } 
    },
  ],
});