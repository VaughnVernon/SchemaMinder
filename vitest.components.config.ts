/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 30000,
    setupFiles: ['./tests/setup-tests.ts'],
    include: [
      'tests/components/**/*.test.tsx'
    ]
  },
})