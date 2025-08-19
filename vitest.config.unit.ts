import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts', 'tests/unit/**/*.test.ts'],
    exclude: ['**/*.spec.ts', 'tests/integration*', 'tests/e2e*', 'tests/readiness*'],
    globals: true,
    setupFiles: ['./tests/unit-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts'
      ]
    },
    timeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});