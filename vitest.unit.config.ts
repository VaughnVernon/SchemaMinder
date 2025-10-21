/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    // No global setup for unit tests
    include: [
      'tests/utils/**/*.test.ts',
      'tests/services/**/*.test.ts',
      'tests/unit/**/*.test.ts',
      'tests/components/**/*.test.tsx'
    ],
    exclude: [
      'tests/integration/**/*.test.ts'
    ]
  },
})