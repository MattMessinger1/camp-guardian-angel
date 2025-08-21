// Playwright config without webServer to test Vite integration
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    headless: false,
    baseURL: 'http://localhost:8080',
  },
  // webServer removed to isolate Vite-related issues
  projects: [
    { 
      name: 'chromium',
      use: { browserName: 'chromium' },
      testMatch: '**/manual-backup-fixed.spec.ts',
    },
  ],
});