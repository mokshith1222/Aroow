import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Increase global test timeout to 30s to accommodate
    // slow procedural generation tests (MASTER preset requires 2500 attempts)
    testTimeout: 30000,
    hookTimeout: 10000,
  },
});
