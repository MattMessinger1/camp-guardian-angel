import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    headless: false,
  },
  projects: [
    { 
      name: 'chromium', 
      use: { 
        channel: 'chrome'
      } 
    },
  ],
});