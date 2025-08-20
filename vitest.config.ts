import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    // Explicitly exclude all playwright test files
    exclude: [
      '**/node_modules/**',
      '**/tests/**/*.spec.ts',
      '**/tests/**/*.test.ts',
      '**/*.spec.ts',
      '**/*.e2e.ts',
      '**/playwright/**',
      '**/e2e/**'
    ],
    // Only run unit tests in src
    include: [
      '**/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    environment: 'node',
    globals: false, // Prevent global expect pollution
  },
});