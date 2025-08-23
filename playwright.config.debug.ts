import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    headless: false,
    // Try without baseURL first
  },
  projects: [
    { 
      name: 'chromium',
      use: { browserName: 'chromium' },
      testMatch: '**/example.spec.ts',
    },
  ],
});