import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Completely prevent vitest loading during E2E tests
  test: process.env.NODE_ENV === 'e2e' ? undefined : {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  // Prevent vitest symbols from being defined during E2E
  define: {
    'import.meta.vitest': process.env.NODE_ENV === 'e2e' ? false : 'undefined',
  },
}));
