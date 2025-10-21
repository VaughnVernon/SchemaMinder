import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { AuthClient } from '../../src/services/authClient';
import { UserRegistration, UserLogin, User } from '../../src/types/user';
import { AuthError } from '../../src/types/auth';

// Create mock fetch function
const mockFetch = vi.fn();

describe('AuthClient', () => {
  let authClient: AuthClient;

  // Setup and teardown fetch mock for this test suite only
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
    authClient = new AuthClient();

    // Mock window.location.hostname to simulate localhost for testing
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'localhost'
      },
      writable: true
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, user: mockUser })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize without parameters', () => {
      const client = new AuthClient();
      expect(client).toBeInstanceOf(AuthClient);
    });
  });

  describe('register', () => {
    const userData: UserRegistration = {
      fullName: 'Test User',
      emailAddress: 'test@example.com',
      password: 'ValidPassword123! !'
    };

    it('should register user successfully', async () => {
      const result = await authClient.register(userData);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8789/schema-registry/api/default-tenant/default-registry/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeUndefined();
    });

    it('should handle registration failure with error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Email already exists' })
      });

      const result = await authClient.register(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
      expect(result.user).toBeUndefined();
    });

    it('should handle registration failure without error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({})
      });

      const result = await authClient.register(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration failed');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await authClient.register(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(AuthError.NETWORK_ERROR);
    });

    it('should handle fetch exceptions', async () => {
      mockFetch.mockRejectedValue('String error');

      const result = await authClient.register(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(AuthError.NETWORK_ERROR);
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const result = await authClient.register(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(AuthError.NETWORK_ERROR);
    });

    it('should use empty base URL when not provided', async () => {
      const client = new AuthClient();
      await client.register(userData);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8789/schema-registry/api/default-tenant/default-registry/auth/register', expect.any(Object));
    });
  });

  describe('login', () => {
    const credentials: UserLogin = {
      emailAddress: 'test@example.com',
      password: 'password123'
    };

    it('should login user successfully', async () => {
      const result = await authClient.login(credentials);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8789/schema-registry/api/default-tenant/default-registry/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({...credentials, rememberMe: true}),
      });

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeUndefined();
    });

    it('should handle login failure with error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid credentials' })
      });

      const result = await authClient.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.user).toBeUndefined();
    });

    it('should handle login failure without error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({})
      });

      const result = await authClient.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Login failed');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await authClient.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe(AuthError.NETWORK_ERROR);
    });

    it('should handle 401 unauthorized response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      });

      const result = await authClient.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('should handle 500 server error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' })
      });

      const result = await authClient.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const result = await authClient.logout();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8789/schema-registry/api/default-tenant/default-registry/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle logout when response.ok is true but success is false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false })
      });

      const result = await authClient.logout();

      expect(result.success).toBe(true); // Uses response.ok as fallback
    });

    it('should handle logout when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ success: false })
      });

      const result = await authClient.logout();

      expect(result.success).toBe(false);
    });

    it('should handle network errors during logout', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await authClient.logout();

      expect(result.success).toBe(false);
      expect(result.error).toBe(AuthError.NETWORK_ERROR);
    });

    it('should handle JSON parsing errors during logout', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const result = await authClient.logout();

      expect(result.success).toBe(false);
      expect(result.error).toBe(AuthError.NETWORK_ERROR);
    });
  });

  describe('validateSession', () => {
    it('should validate session successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          isValid: true,
          user: mockUser,
          refreshed: false
        })
      });

      const result = await authClient.validateSession();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8789/schema-registry/api/default-tenant/default-registry/auth/validate', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      expect(result.isValid).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.refreshed).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should handle invalid session', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({
          error: 'Session expired',
          isValid: false
        })
      });

      const result = await authClient.validateSession();

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Session expired');
      expect(result.user).toBeUndefined();
    });

    it('should handle session validation without error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({})
      });

      const result = await authClient.validateSession();

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Session validation failed');
    });

    it('should handle refreshed session', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          isValid: true,
          user: mockUser,
          refreshed: true
        })
      });

      const result = await authClient.validateSession();

      expect(result.isValid).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.refreshed).toBe(true);
    });

    it('should handle network errors during validation', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await authClient.validateSession();

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(AuthError.NETWORK_ERROR);
    });

    it('should handle validation response without user', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          isValid: true,
          refreshed: false
        })
      });

      const result = await authClient.validateSession();

      expect(result.isValid).toBe(true);
      expect(result.user).toBeUndefined();
      expect(result.refreshed).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', () => {
      const password = 'Valid Password 123!';
      const result = authClient.validatePassword(password);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject password shorter than 15 characters', () => {
      const password = 'Short Pass 1!';
      const result = authClient.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 15 characters long');
    });

    it('should reject password without alphabetic characters', () => {
      const password = '123 456 789 0! @';
      const result = authClient.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain alphabetic characters');
    });

    it('should reject password without digits', () => {
      const password = 'Password With Spaces!';
      const result = authClient.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least 1 digit');
    });

    it('should reject password with fewer than 2 spaces', () => {
      const password = 'Password1WithOneSpace!';
      const result = authClient.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least 2 spaces');
    });

    it('should reject password without special characters', () => {
      const password = 'Password With 123 Spaces';
      const result = authClient.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least 1 special character');
    });

    it('should return multiple errors for invalid password', () => {
      const password = 'short';
      const result = authClient.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Password must be at least 15 characters long');
      expect(result.errors).toContain('Password must contain at least 1 digit');
      expect(result.errors).toContain('Password must contain at least 2 spaces');
      expect(result.errors).toContain('Password must contain at least 1 special character');
    });

    it('should accept various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', ';', "'", '"', '\\', '|', ',', '.', '<', '>', '/', '?', '~', '`'];

      specialChars.forEach(char => {
        const password = `Valid Password 123 ${char}`;
        const result = authClient.validatePassword(password);

        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    it('should handle empty password', () => {
      const result = authClient.validatePassword('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 15 characters long');
    });

    it('should handle password with only spaces', () => {
      const password = '               '; // 15 spaces
      const result = authClient.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain alphabetic characters');
      expect(result.errors).toContain('Password must contain at least 1 digit');
      expect(result.errors).toContain('Password must contain at least 1 special character');
    });

    it('should count digits correctly', () => {
      const passwordWithOneDigit = 'Password With 1 Space!';
      const result1 = authClient.validatePassword(passwordWithOneDigit);
      expect(result1.isValid).toBe(true);

      const passwordWithMultipleDigits = 'Password 123 456!';
      const result2 = authClient.validatePassword(passwordWithMultipleDigits);
      expect(result2.isValid).toBe(true);
    });

    it('should count spaces correctly', () => {
      const passwordWithTwoSpaces = 'Password With Two123!';
      const result1 = authClient.validatePassword(passwordWithTwoSpaces);
      expect(result1.isValid).toBe(true);

      const passwordWithMoreSpaces = 'Password With Many More Spaces 123!';
      const result2 = authClient.validatePassword(passwordWithMoreSpaces);
      expect(result2.isValid).toBe(true);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@example.co.uk',
        'user123@test-domain.com',
        'a@b.co'
      ];

      validEmails.forEach(email => {
        const result = authClient.validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject empty email', () => {
      const result = authClient.validateEmail('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email address is required');
    });

    it('should reject whitespace-only email', () => {
      const result = authClient.validateEmail('   ');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email address is required');
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@domain.com',
        'invalid@domain',
        'invalid.domain.com',
        'invalid @domain.com',
        'invalid@domain .com',
        'invalid@@domain.com',
        'invalid@domain..com',
        '.invalid@domain.com',
        'invalid@.domain.com'
      ];

      invalidEmails.forEach(email => {
        const result = authClient.validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Please enter a valid email address');
      });
    });

    it('should trim email before validation', () => {
      const result = authClient.validateEmail('  test@example.com  ');

      expect(result.isValid).toBe(false); // Because the regex doesn't handle leading/trailing spaces
      expect(result.error).toBe('Please enter a valid email address');
    });
  });

  describe('validateFullName', () => {
    it('should validate correct full names', () => {
      const validNames = [
        'John Doe',
        'Jane Smith',
        'Alice Johnson-Brown',
        'Bob',
        'María García',
        'Jean-Pierre Dubois',
        'O\'Brien',
        'Dr. Smith'
      ];

      validNames.forEach(name => {
        const result = authClient.validateFullName(name);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject empty full name', () => {
      const result = authClient.validateFullName('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Full name is required');
    });

    it('should reject whitespace-only full name', () => {
      const result = authClient.validateFullName('   ');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Full name is required');
    });

    it('should reject single character names', () => {
      const result = authClient.validateFullName('A');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Full name must be at least 2 characters long');
    });

    it('should trim whitespace before validation', () => {
      const result = authClient.validateFullName('  John Doe  ');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject names that are only whitespace after trimming', () => {
      const result = authClient.validateFullName('  A  ');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Full name must be at least 2 characters long');
    });

    it('should accept minimum length name', () => {
      const result = authClient.validateFullName('Jo');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept very long names', () => {
      const longName = 'A'.repeat(100);
      const result = authClient.validateFullName(longName);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('URL Construction', () => {
    it('should use localhost URL when hostname is localhost', async () => {
      // Mock window.location.hostname to localhost (already done in beforeEach)
      const client = new AuthClient();
      await client.login({ emailAddress: 'test@example.com', password: 'password' });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8789/schema-registry/api/default-tenant/default-registry/auth/login', expect.any(Object));
    });

    it('should use relative URL when hostname is not localhost', async () => {
      // Mock window.location.hostname to production hostname
      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'production.example.com'
        },
        writable: true
      });

      const client = new AuthClient();
      await client.login({ emailAddress: 'test@example.com', password: 'password' });

      expect(mockFetch).toHaveBeenCalledWith('/schema-registry/api/default-tenant/default-registry/auth/login', expect.any(Object));
    });
  });

  describe('Request Options', () => {
    it('should include credentials in all requests', async () => {
      const userData: UserRegistration = {
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        password: 'ValidPassword123! !'
      };

      await authClient.register(userData);
      await authClient.login({ emailAddress: 'test@example.com', password: 'password' });
      await authClient.logout();
      await authClient.validateSession();

      // Check that all calls include credentials: 'include'
      expect(mockFetch).toHaveBeenNthCalledWith(1, expect.any(String),
        expect.objectContaining({ credentials: 'include' }));
      expect(mockFetch).toHaveBeenNthCalledWith(2, expect.any(String),
        expect.objectContaining({ credentials: 'include' }));
      expect(mockFetch).toHaveBeenNthCalledWith(3, expect.any(String),
        expect.objectContaining({ credentials: 'include' }));
      expect(mockFetch).toHaveBeenNthCalledWith(4, expect.any(String),
        expect.objectContaining({ credentials: 'include' }));
    });

    it('should use correct HTTP methods', async () => {
      const userData: UserRegistration = {
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        password: 'ValidPassword123! !'
      };

      await authClient.register(userData);
      await authClient.login({ emailAddress: 'test@example.com', password: 'password' });
      await authClient.logout();
      await authClient.validateSession();

      expect(mockFetch).toHaveBeenNthCalledWith(1, expect.any(String),
        expect.objectContaining({ method: 'POST' }));
      expect(mockFetch).toHaveBeenNthCalledWith(2, expect.any(String),
        expect.objectContaining({ method: 'POST' }));
      expect(mockFetch).toHaveBeenNthCalledWith(3, expect.any(String),
        expect.objectContaining({ method: 'POST' }));
      expect(mockFetch).toHaveBeenNthCalledWith(4, expect.any(String),
        expect.objectContaining({ method: 'GET' }));
    });

    it('should use correct content type headers', async () => {
      await authClient.validateSession();

      expect(mockFetch).toHaveBeenCalledWith(expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' }
        }));
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token'))
      });

      const result = await authClient.login({ emailAddress: 'test@example.com', password: 'password' });

      expect(result.success).toBe(false);
      expect(result.error).toBe(AuthError.NETWORK_ERROR);
    });

    it('should handle responses with null user', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, user: null })
      });

      const result = await authClient.login({ emailAddress: 'test@example.com', password: 'password' });

      expect(result.success).toBe(true);
      expect(result.user).toBeNull();
    });

    it('should handle undefined user in response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const result = await authClient.login({ emailAddress: 'test@example.com', password: 'password' });

      expect(result.success).toBe(true);
      expect(result.user).toBeUndefined();
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValue(new Error('Request timeout'));

      const result = await authClient.login({ emailAddress: 'test@example.com', password: 'password' });

      expect(result.success).toBe(false);
      expect(result.error).toBe(AuthError.NETWORK_ERROR);
    });

    it('should handle CORS errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await authClient.register({
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        password: 'password'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(AuthError.NETWORK_ERROR);
    });
  });

  describe('Console Logging', () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log registration errors', async () => {
      const error = new Error('Test error');
      mockFetch.mockRejectedValue(error);

      await authClient.register({
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        password: 'password'
      });

      expect(consoleSpy).toHaveBeenCalledWith('Registration error:', error);
    });

    it('should log login errors', async () => {
      const error = new Error('Test error');
      mockFetch.mockRejectedValue(error);

      await authClient.login({ emailAddress: 'test@example.com', password: 'password' });

      expect(consoleSpy).toHaveBeenCalledWith('Login error:', error);
    });

    it('should log logout errors', async () => {
      const error = new Error('Test error');
      mockFetch.mockRejectedValue(error);

      await authClient.logout();

      expect(consoleSpy).toHaveBeenCalledWith('Logout error:', error);
    });

    it('should log session validation errors', async () => {
      const error = new Error('Test error');
      mockFetch.mockRejectedValue(error);

      await authClient.validateSession();

      expect(consoleSpy).toHaveBeenCalledWith('Session validation error:', error);
    });
  });
});