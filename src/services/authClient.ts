/**
 * Authentication client service for making auth API calls
 */

import { User, UserRegistration, UserLogin } from '../types/user';
import { LoginResult, RegistrationResult, AuthError } from '../types/auth';

// Configuration for API endpoints - same as apiClient.ts
const API_CONFIG = {
  // Use relative URL in production, localhost for development
  get baseUrl() {
    return window.location.hostname === 'localhost' ? 'http://localhost:8789' : '';
  },
  tenantId: 'default-tenant',
  registryId: 'default-registry'
};

export class AuthClient {
  constructor() {
    // No longer need baseUrl parameter - using API_CONFIG
  }

  private getBaseUrl(): string {
    return `${API_CONFIG.baseUrl}/schema-registry/api/${API_CONFIG.tenantId}/${API_CONFIG.registryId}`;
  }

  /**
   * Register a new user
   */
  async register(userData: UserRegistration): Promise<RegistrationResult> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify(userData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Registration failed'
        };
      }

      return {
        success: true,
        user: result.user
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: AuthError.NETWORK_ERROR
      };
    }
  }

  /**
   * Login user
   */
  async login(credentials: UserLogin): Promise<LoginResult> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({
          ...credentials,
          rememberMe: credentials.rememberMe !== undefined ? credentials.rememberMe : true // Default to true for testing
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Login failed'
        };
      }

      return {
        success: true,
        user: result.user
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: AuthError.NETWORK_ERROR
      };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
      });

      const result = await response.json();
      
      return {
        success: result.success || response.ok
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: AuthError.NETWORK_ERROR
      };
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<{
    isValid: boolean;
    user?: User;
    error?: string;
    refreshed?: boolean;
  }> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/auth/validate`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          isValid: false,
          error: result.error || 'Session validation failed'
        };
      }

      return {
        isValid: result.isValid,
        user: result.user,
        refreshed: result.refreshed
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return {
        isValid: false,
        error: AuthError.NETWORK_ERROR
      };
    }
  }

  /**
   * Validate password against requirements
   */
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check minimum length (15 characters)
    if (password.length < 15) {
      errors.push('Password must be at least 15 characters long');
    }

    // Check alphabetic requirement
    if (!/[a-zA-Z]/.test(password)) {
      errors.push('Password must contain alphabetic characters');
    }

    // Check digit requirement (at least 1)
    const digitCount = (password.match(/\d/g) || []).length;
    if (digitCount < 1) {
      errors.push('Password must contain at least 1 digit');
    }

    // Check space requirement (at least 2)
    const spaceCount = (password.match(/ /g) || []).length;
    if (spaceCount < 2) {
      errors.push('Password must contain at least 2 spaces');
    }

    // Check special character requirement (at least 1)
    const specialCharCount = (password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/g) || []).length;
    if (specialCharCount < 1) {
      errors.push('Password must contain at least 1 special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): { isValid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email.trim()) {
      return {
        isValid: false,
        error: 'Email address is required'
      };
    }

    // Check for consecutive dots, dots at start/end
    if (email.includes('..') || email.startsWith('.') || email.includes('@.') || email.includes(' ')) {
      return {
        isValid: false,
        error: 'Please enter a valid email address'
      };
    }

    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        error: 'Please enter a valid email address'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate full name
   */
  validateFullName(fullName: string): { isValid: boolean; error?: string } {
    const trimmed = fullName.trim();
    
    if (!trimmed) {
      return {
        isValid: false,
        error: 'Full name is required'
      };
    }

    if (trimmed.length < 2) {
      return {
        isValid: false,
        error: 'Full name must be at least 2 characters long'
      };
    }

    return { isValid: true };
  }
}