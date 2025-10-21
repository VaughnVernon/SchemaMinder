/**
 * User-related type definitions
 */

/**
 * Available user roles in the system
 */
export type UserRole = 'admin' | 'editor' | 'viewer' | 'guest';

/**
 * User entity stored in the database (without password)
 */
export interface User {
  id: string;
  fullName: string;
  emailAddress: string;
  emailVerified?: boolean;
  roles?: UserRole[];
  createdAt: string;
  updatedAt: string;
}

/**
 * User registration data with plaintext password
 */
export interface UserRegistration {
  fullName: string;
  emailAddress: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * User login credentials
 */
export interface UserLogin {
  emailAddress: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Authentication session stored in the database
 */
export interface AuthSession {
  id: string;
  userId: string;
  sessionToken: string;
  expiresAt: string;
  rememberMe: boolean;
  createdAt: string;
}

/**
 * User with session information
 */
export interface UserWithSession {
  user: User;
  session: AuthSession;
}