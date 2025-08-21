// Minimal Playwright config with zero vitest contamination
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    headless: false,
    baseURL: 'http://localhost:8080',
  },
  // No webServer - assume dev server is already running
  projects: [
    { 
      name: 'chromium',
      use: { browserName: 'chromium' },
      testMatch: 'tests/manual-backup-fixed.spec.ts',
    },
  ],
});