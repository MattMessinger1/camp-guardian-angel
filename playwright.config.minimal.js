// Minimal Playwright config for isolation testing
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    headless: false,
    baseURL: 'http://localhost:8080',
  },
  // No webServer, no globalSetup, no complex configuration
  projects: [
    { 
      name: 'chromium',
      use: { browserName: 'chromium' },
      testMatch: '**/manual-backup-fixed.spec.ts',
    },
  ],
});