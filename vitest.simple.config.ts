/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 30000,
    setupFiles: ['./tests/setup-tests.ts'],
    // Disable parallel execution to avoid conflicts
    fileParallelism: false,
    // Run tests sequentially within each file  
    sequence: {
      concurrent: false
    },
    // Include all test patterns but exclude integration tests that need servers
    include: [
      'tests/utils/**/*.test.ts',
      'tests/services/**/*.test.ts', 
      'tests/components/**/*.test.tsx',
      'tests/parser/**/*.test.ts',
      'tests/polyfills/**/*.test.ts'
    ],
    exclude: [
      'tests/integration/**/*.test.ts',
      'tests/functions/**/*.test.ts',
      'tests/multi-tenant.test.ts',
      '**/node_modules/**'
    ]
  },
})