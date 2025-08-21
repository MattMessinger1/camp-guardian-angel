import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    headless: false,
    baseURL: 'http://localhost:8080',
  },
  // No webServer - test against running dev server
  projects: [
    { 
      name: 'chromium',
      use: { browserName: 'chromium' },
      testMatch: '**/basic-test.spec.ts',
    },
  ],
});