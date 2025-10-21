import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { beforeEach, afterEach, vi } from 'vitest';

/**
 * GLOBAL TEST DOM CLEANUP
 *
 * Ensures clean DOM state before each test to prevent interference between tests.
 * This prevents issues like multiple modal instances causing element selection problems.
 */
beforeEach(() => {
  // Clean up any remaining DOM elements from previous tests
  document.body.innerHTML = '';

  // Reset document title and focus state
  document.title = 'Test';
  if (document.activeElement && document.activeElement !== document.body) {
    (document.activeElement as HTMLElement).blur?.();
  }
});

// Auto cleanup after each test
afterEach(() => {
  cleanup();
});

// Polyfill for CSS.supports which isn't available in jsdom
Object.defineProperty(window, 'CSS', {
  value: {
    supports: () => false,
  },
});

// Mock window.matchMedia which isn't available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock ResizeObserver which isn't available in jsdom
global.ResizeObserver = class ResizeObserver {
  constructor(cb: any) {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Provide a default fetch implementation for tests that aren't integration tests
// Integration tests (api.test.ts, multi-tenant.test.ts, error-handling.test.ts)
// will use the real fetch when TEST_API_PORT is set
// Other test files can override this with vi.stubGlobal if they need specific mocking
if (!global.fetch) {
  // Only set if fetch doesn't already exist (for Node < 18)
  global.fetch = (() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })) as any;
}

// Mock window.alert which isn't available in jsdom
Object.defineProperty(window, 'alert', {
  writable: true,
  value: vi.fn(),
});