import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    // Integration tests need a real test postgres — run them via vitest.integration.config.ts
    exclude: ['src/__tests__/integration/**', 'node_modules/**'],
    environment: 'node',
    globals: true,
    setupFiles: ['src/__tests__/setup.ts'],
  },
});
