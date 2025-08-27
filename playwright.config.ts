import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts', '**/*.test.ts'], // Include both .spec.ts and .test.ts files
  testIgnore: ['**/readiness-*.test.ts'], // Exclude vitest files
  timeout: 30000,
  use: {
    headless: false,
    baseURL: 'http://localhost:8080',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 60000,
  },
});