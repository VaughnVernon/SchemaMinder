import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { EnhancedAuthClient } from '../../src/services/enhancedAuthClient';
import { User } from '../../src/types/user';

// Create mock fetch function
const mockFetch = vi.fn();

describe('EnhancedAuthClient', () => {
  let authClient: EnhancedAuthClient;

  // Setup and teardown fetch mock
  beforeAll(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  const mockUser: User = {
    id: '1',
    fullName: 'Test User',
    emailAddress: 'test@example.com',
    emailVerified: true,
    roles: ['editor'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.location.hostname for tests
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      writable: true
    });

    authClient = new EnhancedAuthClient();

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resetPassword', () => {
    it('should send password reset request successfully', async () => {
      const result = await authClient.resetPassword('test@example.com');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8789/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle password reset failure with error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'User not found' })
      });

      const result = await authClient.resetPassword('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle password reset failure without error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({})
      });

      const result = await authClient.resetPassword('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send reset email');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await authClient.resetPassword('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error occurred');
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const result = await authClient.resetPassword('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error occurred');
    });
  });

  describe('confirmPasswordReset', () => {
    it('should confirm password reset successfully', async () => {
      const result = await authClient.confirmPasswordReset('token123', 'newPassword');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8789/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'token123', newPassword: 'newPassword' })
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle confirmation failure with error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid token' })
      });

      const result = await authClient.confirmPasswordReset('invalid', 'newPassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should handle confirmation failure without error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({})
      });

      const result = await authClient.confirmPasswordReset('token', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to reset password');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await authClient.confirmPasswordReset('token', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error occurred');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: mockUser })
      });

      const result = await authClient.verifyEmail('token123');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8789/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'token123' })
      });

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeUndefined();
    });

    it('should handle verification failure with error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid verification token' })
      });

      const result = await authClient.verifyEmail('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid verification token');
      expect(result.user).toBeUndefined();
    });

    it('should handle verification failure without error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({})
      });

      const result = await authClient.verifyEmail('token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to verify email');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await authClient.verifyEmail('token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error occurred');
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email successfully', async () => {
      const result = await authClient.resendVerificationEmail();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8789/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle resend failure with error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Too many requests' })
      });

      const result = await authClient.resendVerificationEmail();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Too many requests');
    });

    it('should handle resend failure without error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({})
      });

      const result = await authClient.resendVerificationEmail();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to resend verification email');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await authClient.resendVerificationEmail();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error occurred');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updatedUser = { ...mockUser, fullName: 'Updated Name' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updatedUser)
      });

      const result = await authClient.updateProfile({ fullName: 'Updated Name' });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8789/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fullName: 'Updated Name' })
      });

      expect(result.success).toBe(true);
      expect(result.user).toEqual(updatedUser);
      expect(result.error).toBeUndefined();
    });

    it('should handle profile update failure with error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid data' })
      });

      const result = await authClient.updateProfile({ fullName: '' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid data');
      expect(result.user).toBeUndefined();
    });

    it('should handle profile update failure without error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({})
      });

      const result = await authClient.updateProfile({ fullName: 'Name' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update profile');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await authClient.updateProfile({ fullName: 'Name' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error occurred');
    });

    it('should handle partial profile updates', async () => {
      const updatedUser = { ...mockUser, emailAddress: 'new@example.com' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updatedUser)
      });

      const result = await authClient.updateProfile({ emailAddress: 'new@example.com' });

      expect(result.success).toBe(true);
      expect(result.user?.emailAddress).toBe('new@example.com');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const result = await authClient.changePassword('oldPassword', 'newPassword');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8789/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: 'oldPassword', newPassword: 'newPassword' })
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle password change failure with error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Current password incorrect' })
      });

      const result = await authClient.changePassword('wrong', 'newPassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password incorrect');
    });

    it('should handle password change failure without error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({})
      });

      const result = await authClient.changePassword('old', 'new');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to change password');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await authClient.changePassword('old', 'new');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error occurred');
    });

    it('should handle weak password validation', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Password too weak' })
      });

      const result = await authClient.changePassword('old', '123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password too weak');
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await authClient.refreshSession();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8789/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      expect(result).toBe(true);
    });

    it('should return false when refresh fails', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await authClient.refreshSession();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await authClient.refreshSession();

      expect(result).toBe(false);
    });

    it('should handle 401 unauthorized', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401 });

      const result = await authClient.refreshSession();

      expect(result).toBe(false);
    });

    it('should handle 500 server error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const result = await authClient.refreshSession();

      expect(result).toBe(false);
    });
  });

  describe('Inheritance from AuthClient', () => {
    it('should extend AuthClient', () => {
      expect(authClient).toBeInstanceOf(EnhancedAuthClient);
    });

    it('should have baseUrl getter', () => {
      const client = new EnhancedAuthClient();
      expect((client as any).baseUrl).toBe('http://localhost:8789');
    });

    it('should use production baseUrl when not on localhost', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'example.com' },
        writable: true
      });
      const client = new EnhancedAuthClient();
      expect((client as any).baseUrl).toBe('');
    });
  });

  describe('Error logging', () => {
    it('should log errors to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockRejectedValue(new Error('Network failure'));

      await authClient.resetPassword('test@example.com');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Password reset error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });
});
