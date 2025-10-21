/**
 * Enhanced Authentication context with advanced features
 * Includes password reset, email verification, session management, etc.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo, useRef } from 'react';
import { User, UserRegistration, UserLogin } from '../types/user';
import { AuthState } from '../types/auth';
import { EnhancedAuthClient } from '../services/enhancedAuthClient';
import { useAuthOperations } from '../hooks/useAuthOperations';
import { useSessionTimers } from '../hooks/useSessionTimers';

interface EnhancedAuthContextType {
  // State
  authState: AuthState;
  sessionExpiresAt: Date | null;

  // Core Actions
  register: (userData: UserRegistration) => Promise<{ success: boolean; error?: string }>;
  login: (credentials: UserLogin, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;

  // Advanced Features
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;

  // Session Management
  refreshSession: () => Promise<void>;
  extendSession: () => void;
  isSessionExpiringSoon: () => boolean;
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | null>(null);

interface EnhancedAuthProviderProps {
  children: ReactNode;
  baseUrl?: string;
  onSessionExpired?: () => void;
  onSessionWarning?: () => void;
}

export const EnhancedAuthProvider: React.FC<EnhancedAuthProviderProps> = ({
  children,
  baseUrl = '',
  onSessionExpired,
  onSessionWarning
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  // Create auth client (memoized)
  const authClient = useMemo(() => new EnhancedAuthClient(baseUrl), [baseUrl]);

  // Use session timers hook first to get the session manager
  const {
    sessionManager,
    sessionExpiresAt,
    extendSession,
    isSessionExpiringSoon,
    setLogoutCallback
  } = useSessionTimers({
    isAuthenticated: authState.isAuthenticated,
    onSessionExpired,
    onSessionWarning
  });

  // Use auth operations hook with session manager
  const authOperations = useAuthOperations({
    authClient,
    sessionManager,
    setAuthState
  });

  // Set the logout callback for session timers
  useEffect(() => {
    setLogoutCallback(authOperations.logout);
  }, [setLogoutCallback, authOperations.logout]);

  // Initialize authentication state on mount
  useEffect(() => {
    authOperations.initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextValue: EnhancedAuthContextType = {
    authState,
    sessionExpiresAt,
    register: authOperations.register,
    login: authOperations.login,
    logout: authOperations.logout,
    clearError: authOperations.clearError,
    resetPassword: authOperations.resetPassword,
    confirmPasswordReset: authOperations.confirmPasswordReset,
    verifyEmail: authOperations.verifyEmail,
    resendVerificationEmail: authOperations.resendVerificationEmail,
    updateProfile: authOperations.updateProfile,
    changePassword: authOperations.changePassword,
    refreshSession: authOperations.refreshSession,
    extendSession,
    isSessionExpiringSoon,
  };

  return (
    <EnhancedAuthContext.Provider value={contextValue}>
      {children}
    </EnhancedAuthContext.Provider>
  );
};

export const useEnhancedAuth = (): EnhancedAuthContextType => {
  const context = useContext(EnhancedAuthContext);

  if (!context) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }

  return context;
};
