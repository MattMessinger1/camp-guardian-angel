import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 180_000, // 3 minutes for individual tests
  expect: { timeout: 30_000 },
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  // webServer disabled - using existing dev server
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});