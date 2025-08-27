import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/vision-analysis-scenarios.spec.ts'],
  timeout: 30000,
  use: {
    headless: false,
    baseURL: 'http://localhost:8080',
  },
});