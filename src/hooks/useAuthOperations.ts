/**
 * Custom hook for authentication operations
 * Encapsulates all auth-related business logic
 */

import { useCallback } from 'react';
import { User, UserRegistration, UserLogin } from '../types/user';
import { AuthState, AuthError } from '../types/auth';
import { EnhancedAuthClient } from '../services/enhancedAuthClient';
import { SessionManager } from '../services/sessionManager';

interface UseAuthOperationsParams {
  authClient: EnhancedAuthClient;
  sessionManager: SessionManager;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
}

export const useAuthOperations = ({
  authClient,
  sessionManager,
  setAuthState
}: UseAuthOperationsParams) => {
  /**
   * Initialize authentication state
   */
  const initializeAuth = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await authClient.validateSession();

      if (result.isValid && result.user) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: result.user,
          error: null,
        });

        // Check if this is a "remember me" session
        const rememberMe = sessionManager.getRememberMe();
        sessionManager.setupTimers(rememberMe);
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: AuthError.INTERNAL_ERROR,
      });
    }
  }, [authClient, sessionManager, setAuthState]);

  /**
   * Register new user
   */
  const register = useCallback(async (userData: UserRegistration): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await authClient.register(userData);

      if (result.success && result.user) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: result.user,
          error: null,
        });
        sessionManager.setupTimers(false);
        return { success: true };
      }

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: result.error || AuthError.INTERNAL_ERROR,
      }));
      return {
        success: false,
        error: result.error || 'Registration failed'
      };
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = AuthError.NETWORK_ERROR;
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }, [authClient, sessionManager, setAuthState]);

  /**
   * Login user
   */
  const login = useCallback(async (credentials: UserLogin, rememberMe: boolean = false): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await authClient.login({
        ...credentials,
        rememberMe
      });

      if (result.success && result.user) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: result.user,
          error: null,
        });

        sessionManager.setRememberMe(rememberMe);
        sessionManager.setupTimers(rememberMe);

        return { success: true };
      }

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: result.error || AuthError.INTERNAL_ERROR,
      }));
      return {
        success: false,
        error: result.error || 'Login failed'
      };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = AuthError.NETWORK_ERROR;
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }, [authClient, sessionManager, setAuthState]);

  /**
   * Logout user
   */
  const logout = useCallback(async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    sessionManager.clearTimers();

    try {
      await authClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API call fails
    }

    sessionManager.clearRememberMe();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    });
  }, [authClient, sessionManager, setAuthState]);

  /**
   * Reset password
   */
  const resetPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    return authClient.resetPassword(email);
  }, [authClient]);

  /**
   * Confirm password reset
   */
  const confirmPasswordReset = useCallback(async (token: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    return authClient.confirmPasswordReset(token, newPassword);
  }, [authClient]);

  /**
   * Verify email
   */
  const verifyEmail = useCallback(async (token: string): Promise<{ success: boolean; error?: string }> => {
    const result = await authClient.verifyEmail(token);

    if (result.success && result.user) {
      setAuthState(prev => ({
        ...prev,
        user: result.user!,
      }));
    }

    return result;
  }, [authClient, setAuthState]);

  /**
   * Resend verification email
   */
  const resendVerificationEmail = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return authClient.resendVerificationEmail();
  }, [authClient]);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    const result = await authClient.updateProfile(data);

    if (result.success && result.user) {
      setAuthState(prev => ({
        ...prev,
        user: result.user!,
      }));
    }

    return result;
  }, [authClient, setAuthState]);

  /**
   * Change password
   */
  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    return authClient.changePassword(currentPassword, newPassword);
  }, [authClient]);

  /**
   * Refresh session
   */
  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const success = await authClient.refreshSession();

      if (success) {
        const rememberMe = sessionManager.getRememberMe();
        sessionManager.setupTimers(rememberMe);
      } else {
        await logout();
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      await logout();
    }
  }, [authClient, sessionManager, logout]);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, [setAuthState]);

  return {
    initializeAuth,
    register,
    login,
    logout,
    resetPassword,
    confirmPasswordReset,
    verifyEmail,
    resendVerificationEmail,
    updateProfile,
    changePassword,
    refreshSession,
    clearError,
  };
};
