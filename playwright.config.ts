import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 180_000, // 3 minutes for individual tests
  expect: { timeout: 30_000 },
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    headless: false, // Force headed mode
  },
  // Removed webServer - start dev server manually first
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});