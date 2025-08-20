import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'tests/unit/**/*.unit.ts'],
    exclude: [
      'tests/**',
      'node_modules/**',
      'dist/**',
      '.{idea,git,cache,output,temp}/**'
    ]
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});