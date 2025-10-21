/**
 * Session management service for authentication
 */

import { SqlStorage } from '@cloudflare/workers-types';
import { UserDatabaseOperations } from '../persistence/userOperations';
import { User, AuthSession } from '../types/user';
import { AuthError } from '../types/auth';

export interface AuthenticatedContext {
  user: User;
  session: AuthSession;
}

export interface SessionValidationResult {
  isValid: boolean;
  context?: AuthenticatedContext;
  error?: AuthError;
}

export class SessionService {
  private userOps: UserDatabaseOperations;

  constructor(sql: SqlStorage) {
    this.userOps = new UserDatabaseOperations(sql);
  }

  /**
   * Validate session token and return authenticated context
   */
  async validateSessionToken(sessionToken: string): Promise<SessionValidationResult> {
    try {
      if (!sessionToken) {
        return {
          isValid: false,
          error: AuthError.INVALID_SESSION
        };
      }

      // Get session information
      const session = await this.userOps.getSession(sessionToken);
      if (!session) {
        return {
          isValid: false,
          error: AuthError.INVALID_SESSION
        };
      }

      // Check if session is expired
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      
      if (now >= expiresAt) {
        // Clean up expired session
        await this.userOps.deleteSession(sessionToken);
        return {
          isValid: false,
          error: AuthError.SESSION_EXPIRED
        };
      }

      // Get user information
      const user = await this.userOps.getUserById(session.userId);
      if (!user) {
        // Clean up orphaned session
        await this.userOps.deleteSession(sessionToken);
        return {
          isValid: false,
          error: AuthError.USER_NOT_FOUND
        };
      }

      return {
        isValid: true,
        context: {
          user,
          session
        }
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return {
        isValid: false,
        error: AuthError.INTERNAL_ERROR
      };
    }
  }

  /**
   * Extract session token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader) {
      return null;
    }

    // Support "Bearer <token>" format
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) {
      return bearerMatch[1];
    }

    // Support direct token format
    return authHeader.trim() || null;
  }

  /**
   * Extract session token from cookie
   */
  extractTokenFromCookie(cookieHeader: string | null, cookieName: string = 'sessionToken'): string | null {
    if (!cookieHeader) {
      return null;
    }

    const cookies = this.parseCookies(cookieHeader);
    return cookies[cookieName] || null;
  }

  /**
   * Create secure cookie string for session token
   */
  createSessionCookie(
    sessionToken: string, 
    expiresAt: string,
    options: {
      domain?: string;
      secure?: boolean;
      sameSite?: 'Strict' | 'Lax' | 'None';
      httpOnly?: boolean;
    } = {}
  ): string {
    const expires = new Date(expiresAt).toUTCString();
    const {
      domain,
      secure = true,
      sameSite = 'Lax', // Changed from 'Strict' to 'Lax' for better compatibility
      httpOnly = true
    } = options;

    let cookie = `sessionToken=${sessionToken}; Expires=${expires}; Path=/`;
    
    if (domain) {
      cookie += `; Domain=${domain}`;
    }
    
    if (secure) {
      cookie += '; Secure';
    }
    
    if (httpOnly) {
      cookie += '; HttpOnly';
    }
    
    cookie += `; SameSite=${sameSite}`;
    
    return cookie;
  }

  /**
   * Create cookie string to clear session
   */
  createClearSessionCookie(
    options: {
      domain?: string;
      secure?: boolean;
      sameSite?: 'Strict' | 'Lax' | 'None';
      httpOnly?: boolean;
    } = {}
  ): string {
    const {
      domain,
      secure = true,
      sameSite = 'Lax', // Changed from 'Strict' to 'Lax' for better compatibility
      httpOnly = true
    } = options;

    let cookie = `sessionToken=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/`;
    
    if (domain) {
      cookie += `; Domain=${domain}`;
    }
    
    if (secure) {
      cookie += '; Secure';
    }
    
    if (httpOnly) {
      cookie += '; HttpOnly';
    }
    
    cookie += `; SameSite=${sameSite}`;
    
    return cookie;
  }

  /**
   * Logout user by invalidating session
   */
  async logout(sessionToken: string): Promise<boolean> {
    try {
      return await this.userOps.deleteSession(sessionToken);
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions (maintenance task)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      return await this.userOps.cleanupExpiredSessions();
    } catch (error) {
      console.error('Session cleanup error:', error);
      return 0;
    }
  }

  /**
   * Check if session is close to expiry (within 24 hours)
   */
  isSessionNearExpiry(session: AuthSession): boolean {
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilExpiry <= 24;
  }

  /**
   * Refresh session if eligible (near expiry and remember me enabled)
   */
  async refreshSessionIfNeeded(sessionToken: string): Promise<{
    refreshed: boolean;
    newToken?: string;
    newExpiresAt?: string;
  }> {
    try {
      const session = await this.userOps.getSession(sessionToken);
      if (!session) {
        return { refreshed: false };
      }

      // Only refresh if remember me is enabled and session is near expiry
      if (!session.rememberMe || !this.isSessionNearExpiry(session)) {
        return { refreshed: false };
      }

      // Create new session
      const newSessionResult = await this.userOps.createSession(session.userId, true);
      if (!newSessionResult.success || !newSessionResult.sessionToken || !newSessionResult.expiresAt) {
        return { refreshed: false };
      }

      // Delete old session
      await this.userOps.deleteSession(sessionToken);

      return {
        refreshed: true,
        newToken: newSessionResult.sessionToken,
        newExpiresAt: newSessionResult.expiresAt
      };
    } catch (error) {
      console.error('Session refresh error:', error);
      return { refreshed: false };
    }
  }

  /**
   * Parse cookie header into key-value pairs
   */
  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    cookieHeader.split(';').forEach(cookie => {
      const [key, ...valueParts] = cookie.trim().split('=');
      if (key) {
        cookies[key] = valueParts.join('=') || '';
      }
    });
    
    return cookies;
  }
}