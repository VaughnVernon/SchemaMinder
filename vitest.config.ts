/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 10000, // Reduced from 30000 to fail faster on hanging tests
    hookTimeout: 10000, // Also limit hook timeouts
    globalSetup: './tests/global-setup.ts',
    setupFiles: ['./tests/setup-tests.ts'],
    // Disable parallel execution to avoid port conflicts
    fileParallelism: false,
    // Run tests sequentially within each file
    sequence: {
      concurrent: false,
      shuffle: false
    },
    // Force tests to run one at a time
    maxConcurrency: 1,
    // Disable file watching to reduce file descriptor usage
    watch: false,
    // Reduce pool size to limit resource usage
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
        // Isolate each test file to prevent state leakage
        isolate: true
      }
    },
    // Retry flaky tests up to 2 times
    retry: 2,
    // Code coverage configuration
    coverage: {
      provider: 'v8', // Use V8 provider for better performance
      reporter: ['text', 'html', 'clover', 'json'],
      reportsDirectory: 'coverage',
      exclude: [
        'coverage/**',
        'dist/**',
        'node_modules/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/build/**',
        'scripts/**',
        'tests/**',
        'party/**', // PartyKit server code
        'functions/**', // Cloudflare Workers
        'src/parser/generated/**', // Generated parser files
        'src/polyfills/**', // Browser polyfills
        'src/main.tsx', // Application entry point - no meaningful tests
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx'
      ],
      include: [
        'src/**/*.ts',
        'src/**/*.tsx'
      ],
      // Coverage thresholds
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      },
      // Report uncovered lines
      all: true,
      skipFull: false
    }
  },
})