/**
 * Authentication context for managing user authentication state
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, UserRegistration, UserLogin } from '../types/user';
import { AuthState, AuthError } from '../types/auth';
import { AuthClient } from '../services/authClient';

interface AuthContextType {
  // State
  authState: AuthState;
  
  // Actions
  register: (userData: UserRegistration) => Promise<{ success: boolean; error?: string }>;
  login: (credentials: UserLogin) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  baseUrl?: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  baseUrl = ''
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  const authClient = new AuthClient(baseUrl);

  // Initialize authentication state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
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
  };

  const register = async (userData: UserRegistration): Promise<{ success: boolean; error?: string }> => {
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
        return { success: true };
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || AuthError.INTERNAL_ERROR,
        }));
        return { 
          success: false, 
          error: result.error || 'Registration failed' 
        };
      }
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
  };

  const login = async (credentials: UserLogin): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await authClient.login(credentials);
      
      if (result.success && result.user) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: result.user,
          error: null,
        });
        return { success: true };
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || AuthError.INTERNAL_ERROR,
        }));
        return { 
          success: false, 
          error: result.error || 'Login failed' 
        };
      }
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
  };

  const logout = async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await authClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API call fails
    }

    // Always clear local auth state
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
    });
  };

  const clearError = (): void => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  const contextValue: AuthContextType = {
    authState,
    register,
    login,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};