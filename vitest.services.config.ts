/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 60000,
    setupFiles: ['./tests/components-setup.ts'],
    // Include services, utils, polyfills, parser, hooks, components, functions, and party tests
    include: ['tests/services/**/*.test.ts', 'tests/utils/**/*.test.ts', 'tests/polyfills/**/*.test.ts', 'tests/parser/**/*.test.ts', 'tests/hooks/**/*.test.ts', 'tests/components/**/*.test.tsx', 'tests/functions/**/*.test.ts', 'tests/party/**/*.test.ts'],
    // Disable parallel execution to avoid conflicts
    fileParallelism: false,
    sequence: {
      concurrent: false
    }
  },
})