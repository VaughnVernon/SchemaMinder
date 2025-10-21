import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import { AuthClient } from '../../src/services/authClient';
import { AuthError } from '../../src/types/auth';
import { User, UserRegistration, UserLogin } from '../../src/types/user';

// Mock AuthClient
vi.mock('../../src/services/authClient', () => ({
  AuthClient: vi.fn().mockImplementation(() => ({
    validateSession: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn()
  }))
}));

// Test component that uses the auth context
const TestComponent = () => {
  const {
    authState,
    register,
    login,
    logout,
    clearError
  } = useAuth();

  return (
    <div>
      <div data-testid="auth-state">
        {JSON.stringify({
          isAuthenticated: authState.isAuthenticated,
          isLoading: authState.isLoading,
          hasUser: !!authState.user,
          error: authState.error
        })}
      </div>
      <button
        data-testid="register-btn"
        onClick={() => register({
          fullName: 'Test User',
          emailAddress: 'test@example.com',
          password: 'TestPassword123!'
        })}
      >
        Register
      </button>
      <button
        data-testid="login-btn"
        onClick={() => login({
          emailAddress: 'test@example.com',
          password: 'password123'
        })}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
      <button data-testid="clear-error-btn" onClick={clearError}>
        Clear Error
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  let mockAuthClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthClient = {
      validateSession: vi.fn(),
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn()
    };
    (AuthClient as any).mockImplementation(() => mockAuthClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider Setup', () => {
    it('should provide context to children', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-state')).toBeInTheDocument();
    });

    it('should accept baseUrl prop', () => {
      render(
        <AuthProvider baseUrl="https://api.example.com">
          <TestComponent />
        </AuthProvider>
      );

      expect(AuthClient).toHaveBeenCalledWith('https://api.example.com');
    });

    it('should use empty string as default baseUrl', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(AuthClient).toHaveBeenCalledWith('');
    });
  });

  describe('useAuth Hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Mock console.error to suppress error output in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should provide auth context when used within AuthProvider', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState).toHaveProperty('isAuthenticated');
      expect(authState).toHaveProperty('isLoading');
      expect(authState).toHaveProperty('hasUser');
      expect(authState).toHaveProperty('error');
    });
  });

  describe('Initial State', () => {
    it('should have correct initial auth state', async () => {
      mockAuthClient.validateSession.mockResolvedValue({
        isValid: false,
        user: null
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Initial loading state
      let authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isLoading).toBe(true);

      // Wait for initialization to complete
      await waitFor(() => {
        const updatedAuthState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(updatedAuthState.isLoading).toBe(false);
      });

      const finalAuthState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(finalAuthState).toEqual({
        isAuthenticated: false,
        isLoading: false,
        hasUser: false,
        error: null
      });
    });

    it('should initialize with valid session', async () => {
      const mockUser: User = {
        id: '1',
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        emailVerified: true,
        roles: ['viewer'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockAuthClient.validateSession.mockResolvedValue({
        isValid: true,
        user: mockUser
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
        expect(authState.hasUser).toBe(true);
        expect(authState.isLoading).toBe(false);
        expect(authState.error).toBeNull();
      });
    });

    it('should handle initialization error', async () => {
      mockAuthClient.validateSession.mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.hasUser).toBe(false);
        expect(authState.isLoading).toBe(false);
        expect(authState.error).toBe(AuthError.INTERNAL_ERROR);
      });
    });
  });

  describe('Registration', () => {
    it('should handle successful registration', async () => {
      const mockUser: User = {
        id: '1',
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        emailVerified: false,
        roles: ['viewer'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockAuthClient.validateSession.mockResolvedValue({
        isValid: false,
        user: null
      });

      mockAuthClient.register.mockResolvedValue({
        success: true,
        user: mockUser
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isLoading).toBe(false);
      });

      // Trigger registration
      await act(async () => {
        screen.getByTestId('register-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
        expect(authState.hasUser).toBe(true);
        expect(authState.isLoading).toBe(false);
        expect(authState.error).toBeNull();
      });

      expect(mockAuthClient.register).toHaveBeenCalledWith({
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        password: 'TestPassword123!'
      });
    });

    it('should handle registration failure with error message', async () => {
      mockAuthClient.validateSession.mockResolvedValue({
        isValid: false,
        user: null
      });

      mockAuthClient.register.mockResolvedValue({
        success: false,
        error: 'Email already exists'
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isLoading).toBe(false);
      });

      await act(async () => {
        screen.getByTestId('register-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.hasUser).toBe(false);
        expect(authState.isLoading).toBe(false);
        expect(authState.error).toBe('Email already exists');
      });
    });

    it('should handle registration network error', async () => {
      mockAuthClient.validateSession.mockResolvedValue({
        isValid: false,
        user: null
      });

      mockAuthClient.register.mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isLoading).toBe(false);
      });

      await act(async () => {
        screen.getByTestId('register-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.hasUser).toBe(false);
        expect(authState.isLoading).toBe(false);
        expect(authState.error).toBe(AuthError.NETWORK_ERROR);
      });
    });

    it('should handle registration with missing user in response', async () => {
      mockAuthClient.validateSession.mockResolvedValue({
        isValid: false,
        user: null
      });

      mockAuthClient.register.mockResolvedValue({
        success: true,
        user: null
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isLoading).toBe(false);
      });

      await act(async () => {
        screen.getByTestId('register-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.error).toBe(AuthError.INTERNAL_ERROR);
      });
    });
  });

  describe('Login', () => {
    it('should handle successful login', async () => {
      const mockUser: User = {
        id: '1',
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        emailVerified: true,
        roles: ['viewer'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockAuthClient.validateSession.mockResolvedValue({
        isValid: false,
        user: null
      });

      mockAuthClient.login.mockResolvedValue({
        success: true,
        user: mockUser
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isLoading).toBe(false);
      });

      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
        expect(authState.hasUser).toBe(true);
        expect(authState.isLoading).toBe(false);
        expect(authState.error).toBeNull();
      });

      expect(mockAuthClient.login).toHaveBeenCalledWith({
        emailAddress: 'test@example.com',
        password: 'password123'
      });
    });

    it('should handle login failure with error message', async () => {
      mockAuthClient.validateSession.mockResolvedValue({
        isValid: false,
        user: null
      });

      mockAuthClient.login.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isLoading).toBe(false);
      });

      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.hasUser).toBe(false);
        expect(authState.isLoading).toBe(false);
        expect(authState.error).toBe('Invalid credentials');
      });
    });

    it('should handle login network error', async () => {
      mockAuthClient.validateSession.mockResolvedValue({
        isValid: false,
        user: null
      });

      mockAuthClient.login.mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isLoading).toBe(false);
      });

      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.hasUser).toBe(false);
        expect(authState.isLoading).toBe(false);
        expect(authState.error).toBe(AuthError.NETWORK_ERROR);
      });
    });

    it('should handle login with missing user in response', async () => {
      mockAuthClient.validateSession.mockResolvedValue({
        isValid: false,
        user: null
      });

      mockAuthClient.login.mockResolvedValue({
        success: true,
        user: null
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isLoading).toBe(false);
      });

      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.error).toBe(AuthError.INTERNAL_ERROR);
      });
    });
  });

  describe('Logout', () => {
    it('should handle successful logout', async () => {
      const mockUser: User = {
        id: '1',
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        emailVerified: true,
        roles: ['viewer'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Start with authenticated state
      mockAuthClient.validateSession.mockResolvedValue({
        isValid: true,
        user: mockUser
      });

      mockAuthClient.logout.mockResolvedValue(undefined);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial authenticated state
      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
      });

      await act(async () => {
        screen.getByTestId('logout-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.hasUser).toBe(false);
        expect(authState.isLoading).toBe(false);
        expect(authState.error).toBeNull();
      });

      expect(mockAuthClient.logout).toHaveBeenCalled();
    });

    it('should handle logout even when API call fails', async () => {
      const mockUser: User = {
        id: '1',
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        emailVerified: true,
        roles: ['viewer'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockAuthClient.validateSession.mockResolvedValue({
        isValid: true,
        user: mockUser
      });

      mockAuthClient.logout.mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
      });

      await act(async () => {
        screen.getByTestId('logout-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.hasUser).toBe(false);
        expect(authState.isLoading).toBe(false);
        expect(authState.error).toBeNull();
      });
    });
  });

  describe('Error Management', () => {
    it('should clear error when clearError is called', async () => {
      mockAuthClient.validateSession.mockResolvedValue({
        isValid: false,
        user: null
      });

      mockAuthClient.login.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isLoading).toBe(false);
      });

      // Trigger error
      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.error).toBe('Invalid credentials');
      });

      // Clear error
      await act(async () => {
        screen.getByTestId('clear-error-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.error).toBeNull();
      });
    });

    it('should clear error before new operations', async () => {
      mockAuthClient.validateSession.mockResolvedValue({
        isValid: false,
        user: null
      });

      // First login fails
      mockAuthClient.login.mockResolvedValueOnce({
        success: false,
        error: 'Invalid credentials'
      });

      // Second login succeeds
      const mockUser: User = {
        id: '1',
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        emailVerified: true,
        roles: ['viewer'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockAuthClient.login.mockResolvedValueOnce({
        success: true,
        user: mockUser
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isLoading).toBe(false);
      });

      // First login - should fail
      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.error).toBe('Invalid credentials');
      });

      // Second login - should succeed and clear error
      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
        expect(authState.error).toBeNull();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading during registration', async () => {
      mockAuthClient.validateSession.mockResolvedValue({
        isValid: false,
        user: null
      });

      // Mock a slow registration response
      mockAuthClient.register.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ success: true, user: null }), 100)
        )
      );

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isLoading).toBe(false);
      });

      act(() => {
        screen.getByTestId('register-btn').click();
      });

      // Should show loading immediately
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isLoading).toBe(true);
    });

    it('should show loading during login', async () => {
      mockAuthClient.validateSession.mockResolvedValue({
        isValid: false,
        user: null
      });

      mockAuthClient.login.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ success: true, user: null }), 100)
        )
      );

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isLoading).toBe(false);
      });

      act(() => {
        screen.getByTestId('login-btn').click();
      });

      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isLoading).toBe(true);
    });

    it('should show loading during logout', async () => {
      const mockUser: User = {
        id: '1',
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        emailVerified: true,
        roles: ['viewer'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockAuthClient.validateSession.mockResolvedValue({
        isValid: true,
        user: mockUser
      });

      mockAuthClient.logout.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve(undefined), 100)
        )
      );

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
      });

      act(() => {
        screen.getByTestId('logout-btn').click();
      });

      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isLoading).toBe(true);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle registration failure without error message', async () => {
      mockAuthClient.validateSession.mockResolvedValue({
        isValid: false,
        user: null
      });

      mockAuthClient.register.mockResolvedValue({
        success: false,
        error: null
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isLoading).toBe(false);
      });

      await act(async () => {
        screen.getByTestId('register-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.error).toBe(AuthError.INTERNAL_ERROR);
      });
    });

    it('should handle login failure without error message', async () => {
      mockAuthClient.validateSession.mockResolvedValue({
        isValid: false,
        user: null
      });

      mockAuthClient.login.mockResolvedValue({
        success: false,
        error: null
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isLoading).toBe(false);
      });

      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.error).toBe(AuthError.INTERNAL_ERROR);
      });
    });
  });
});