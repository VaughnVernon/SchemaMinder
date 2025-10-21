/**
 * Enhanced authentication client
 * Extends AuthClient with additional authentication features
 */

import { AuthClient } from './authClient';
import { User } from '../types/user';

export interface AuthOperationResult {
  success: boolean;
  error?: string;
}

export interface VerifyEmailResult extends AuthOperationResult {
  user?: User;
}

export class EnhancedAuthClient extends AuthClient {
  protected get baseUrl(): string {
    // Access parent's baseUrl configuration
    return window.location.hostname === 'localhost' ? 'http://localhost:8789' : '';
  }

  /**
   * Request password reset email
   */
  async resetPassword(email: string): Promise<AuthOperationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        return { success: true };
      }

      const data = await response.json();
      return {
        success: false,
        error: data.message || 'Failed to send reset email'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(token: string, newPassword: string): Promise<AuthOperationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/confirm-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      if (response.ok) {
        return { success: true };
      }

      const data = await response.json();
      return {
        success: false,
        error: data.message || 'Failed to reset password'
      };
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  /**
   * Verify email address with token
   */
  async verifyEmail(token: string): Promise<VerifyEmailResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          user: data.user
        };
      }

      const data = await response.json();
      return {
        success: false,
        error: data.message || 'Failed to verify email'
      };
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  /**
   * Resend verification email to current user
   */
  async resendVerificationEmail(): Promise<AuthOperationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        return { success: true };
      }

      const data = await response.json();
      return {
        success: false,
        error: data.message || 'Failed to resend verification email'
      };
    } catch (error) {
      console.error('Resend verification error:', error);
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<User>): Promise<VerifyEmailResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        return {
          success: true,
          user: updatedUser
        };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Failed to update profile'
      };
    } catch (error) {
      console.error('Profile update error:', error);
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthOperationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.ok) {
        return { success: true };
      }

      const data = await response.json();
      return {
        success: false,
        error: data.message || 'Failed to change password'
      };
    } catch (error) {
      console.error('Password change error:', error);
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      return response.ok;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  }
}
