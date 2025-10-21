import React from 'react';
import { render, waitFor as originalWaitFor, waitForOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthState } from '../src/types/auth';
import { UserRole } from '../src/types/user';

// Default mock auth state for tests
export const defaultMockAuthState: AuthState = {
  isAuthenticated: true,
  isLoading: false,
  user: {
    id: 'test-user-id',
    fullName: 'Test User',
    emailAddress: 'test@example.com',
    emailVerified: true,
    roles: ['viewer'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  error: null
};

// Enhanced mock auth state for advanced features
export const enhancedMockAuthState = {
  authState: defaultMockAuthState,
  sessionExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
  register: vi.fn().mockResolvedValue({ success: true }),
  login: vi.fn().mockResolvedValue({ success: true }),
  logout: vi.fn().mockResolvedValue(undefined),
  clearError: vi.fn(),
  resetPassword: vi.fn().mockResolvedValue({ success: true }),
  confirmPasswordReset: vi.fn().mockResolvedValue({ success: true }),
  verifyEmail: vi.fn().mockResolvedValue({ success: true }),
  resendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  updateProfile: vi.fn().mockResolvedValue({ success: true }),
  changePassword: vi.fn().mockResolvedValue({ success: true }),
  refreshSession: vi.fn().mockResolvedValue(undefined),
  extendSession: vi.fn(),
  isSessionExpiringSoon: vi.fn().mockReturnValue(false)
};

// Mock auth states for different user roles
export const createMockAuthStateWithRole = (role: UserRole): AuthState => ({
  ...defaultMockAuthState,
  user: {
    ...defaultMockAuthState.user!,
    roles: [role]
  }
});

export const adminMockAuthState = createMockAuthStateWithRole('admin');
export const editorMockAuthState = createMockAuthStateWithRole('editor');
export const viewerMockAuthState = createMockAuthStateWithRole('viewer');
export const guestMockAuthState = createMockAuthStateWithRole('guest');

// Mock auth state for unverified email
export const unverifiedEmailMockAuthState: AuthState = {
  ...defaultMockAuthState,
  user: {
    ...defaultMockAuthState.user!,
    emailVerified: false
  }
};

// Mock auth state for unauthenticated user
export const unauthenticatedMockAuthState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  error: null
};

// Mock auth state for loading
export const loadingMockAuthState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null
};

// Mock auth state with error
export const errorMockAuthState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  error: 'Authentication failed'
};

// Helper function to render components with mocked auth (assumes useAuth is already mocked)
export const renderWithAuth = (
  component: React.ReactElement,
  authState?: Partial<AuthState>
) => {
  return render(component);
};

// Helper function to render components without authentication (logged out state)
export const renderWithoutAuth = (component: React.ReactElement) => {
  return render(component);
};

// Helper function to render components with enhanced auth features
export const renderWithEnhancedAuth = (
  component: React.ReactElement,
  authState?: Partial<AuthState>
) => {
  return render(component);
};

// Mock implementations for authentication functions
export const createMockAuthFunctions = () => ({
  register: vi.fn().mockResolvedValue({ success: true }),
  login: vi.fn().mockResolvedValue({ success: true }),
  logout: vi.fn().mockResolvedValue(undefined),
  clearError: vi.fn(),
  resetPassword: vi.fn().mockResolvedValue({ success: true }),
  confirmPasswordReset: vi.fn().mockResolvedValue({ success: true }),
  verifyEmail: vi.fn().mockResolvedValue({ success: true }),
  resendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  updateProfile: vi.fn().mockResolvedValue({ success: true }),
  changePassword: vi.fn().mockResolvedValue({ success: true }),
  refreshSession: vi.fn().mockResolvedValue(undefined),
  extendSession: vi.fn(),
  isSessionExpiringSoon: vi.fn().mockReturnValue(false)
});

// Helper to mock permissions
export const mockPermissions = {
  userRoles: ['viewer'],
  highestRole: 'viewer' as UserRole,
  permissions: [],
  can: {
    create: vi.fn().mockReturnValue(false),
    read: vi.fn().mockReturnValue(true),
    update: vi.fn().mockReturnValue(false),
    delete: vi.fn().mockReturnValue(false),
    approve: vi.fn().mockReturnValue(false),
    publish: vi.fn().mockReturnValue(false),
    manage: vi.fn().mockReturnValue(false),
    perform: vi.fn().mockReturnValue(false)
  },
  products: {
    create: false,
    read: true,
    update: false,
    delete: false
  },
  domains: {
    create: false,
    read: true,
    update: false,
    delete: false
  },
  contexts: {
    create: false,
    read: true,
    update: false,
    delete: false
  },
  schemas: {
    create: false,
    read: true,
    update: false,
    delete: false
  },
  schemaVersions: {
    create: false,
    read: true,
    update: false,
    delete: false,
    approve: false,
    publish: false
  },
  userManagement: {
    read: false,
    create: false,
    update: false,
    delete: false,
    manage: false
  },
  systemSettings: {
    read: false,
    update: false,
    manage: false
  },
  is: {
    admin: false,
    editor: false,
    viewer: true,
    guest: false
  },
  hasRole: vi.fn().mockReturnValue(false),
  hasAnyRole: vi.fn().mockReturnValue(false),
  hasAllRoles: vi.fn().mockReturnValue(false),
  hasPermission: vi.fn().mockReturnValue(false),
  RESOURCES: {},
  ACTIONS: {}
};

// Enhanced waitFor with better defaults for our test environment
export async function waitFor<T>(
  callback: () => T | Promise<T>,
  options?: waitForOptions
): Promise<T> {
  // Use shorter timeout by default to fail fast on infinite loops
  const defaultOptions: waitForOptions = {
    timeout: 5000, // 5 seconds instead of 30
    interval: 50,  // Check more frequently
    ...options
  };

  try {
    return await originalWaitFor(callback, defaultOptions);
  } catch (error) {
    // If waitFor times out, clear any pending timers to prevent test hanging
    vi.clearAllTimers();
    throw error;
  }
}

// Helper to safely cleanup timers after async operations
export async function withTimerCleanup<T>(
  asyncFn: () => Promise<T>
): Promise<T> {
  try {
    return await asyncFn();
  } finally {
    vi.clearAllTimers();
  }
}

// Helper to run tests with isolated timer context
export function describeWithTimers(
  name: string,
  fn: () => void
) {
  describe(name, () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    fn();
  });
}

// waitFor is already exported above