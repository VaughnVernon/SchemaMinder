/**
 * User-related type definitions for Cloudflare Functions
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
  roles: UserRole[];
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
 * User data stored in database (internal use)
 */
export interface UserRecord {
  id: string;
  full_name: string;
  email_address: string;
  password_hash: string;
  roles: string; // JSON string of roles array
  created_at: string;
  updated_at: string;
}

/**
 * Session data stored in database (internal use)
 */
export interface SessionRecord {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: string;
  remember_me: number;
  created_at: string;
}