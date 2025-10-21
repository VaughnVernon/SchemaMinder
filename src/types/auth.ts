/**
 * Authentication-related type definitions
 */

import { User } from './user';

/**
 * Result of a successful login
 */
export interface LoginResult {
  success: boolean;
  user?: User;
  sessionToken?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Result of a registration attempt
 */
export interface RegistrationResult {
  success: boolean;
  user?: User;
  sessionToken?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Authentication errors
 */
export enum AuthError {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_PASSWORD_FORMAT = 'INVALID_PASSWORD_FORMAT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_SESSION = 'INVALID_SESSION',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  INVALID_NAME_FORMAT = 'INVALID_NAME_FORMAT',
  PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT',
  PASSWORD_MISSING_REQUIREMENTS = 'PASSWORD_MISSING_REQUIREMENTS',
}

/**
 * Session data stored in cookies
 */
export interface SessionData {
  sessionToken: string;
  userId: string;
  expiresAt: string;
}

/**
 * Password validation requirements
 */
export interface PasswordRequirements {
  minLength: number;
  requireAlphabetic: boolean;
  minDigits: number;
  minSpaces: number;
  minSpecialChars: number;
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Default password requirements
 */
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 15,
  requireAlphabetic: true,
  minDigits: 1,
  minSpaces: 2,
  minSpecialChars: 1,
};

/**
 * Authentication state in the application
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: AuthError | null;
}