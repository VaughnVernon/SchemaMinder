/**
 * User database operations
 */

import { SqlStorage } from '@cloudflare/workers-types';
import { UserRecord, SessionRecord, User, AuthSession } from '../types/user';
import { UserRegistration, UserLogin, LoginResult, RegistrationResult, AuthError } from '../types/auth';
import { PasswordService } from '../services/passwordService';

export class UserDatabaseOperations {
  private sql: SqlStorage;

  constructor(sql: SqlStorage) {
    this.sql = sql;
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  // ================== USER OPERATIONS ==================

  /**
   * Create a new user account
   */
  async createUser(userData: UserRegistration): Promise<RegistrationResult> {
    try {
      // Validate password
      const passwordValidation = PasswordService.validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors.join(', ')
        };
      }

      // Check if email already exists
      const existingUser = await this.sql.exec(
        `SELECT id FROM users WHERE email_address = ?`,
        userData.emailAddress
      ).toArray();

      if (existingUser.length > 0) {
        return {
          success: false,
          error: AuthError.EMAIL_ALREADY_EXISTS
        };
      }

      // Hash password
      const passwordHash = await PasswordService.hashPassword(userData.password);
      
      // Create user with editor role by default
      const userId = crypto.randomUUID();
      const timestamp = this.getTimestamp();
      const defaultRoles = JSON.stringify(['editor']); // Default to editor role

      await this.sql.exec(
        `INSERT INTO users (id, full_name, email_address, password_hash, roles, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        userId, userData.fullName, userData.emailAddress, passwordHash, defaultRoles, timestamp, timestamp
      );

      // Get created user
      const user = await this.getUserById(userId);
      if (!user) {
        return {
          success: false,
          error: AuthError.INTERNAL_ERROR
        };
      }

      // Create session if rememberMe is true
      let sessionToken = '';
      let expiresAt = '';
      
      if (userData.rememberMe) {
        const sessionResult = await this.createSession(userId, true);
        if (sessionResult.success && sessionResult.sessionToken && sessionResult.expiresAt) {
          sessionToken = sessionResult.sessionToken;
          expiresAt = sessionResult.expiresAt;
        }
      }

      return {
        success: true,
        user,
        sessionToken: sessionToken || undefined,
        expiresAt: expiresAt || undefined
      };
    } catch (error) {
      console.error('User creation error:', error);
      return {
        success: false,
        error: AuthError.INTERNAL_ERROR
      };
    }
  }

  /**
   * Login user with credentials
   */
  async loginUser(credentials: UserLogin): Promise<LoginResult> {
    try {
      // Get user by email
      const userResults = await this.sql.exec(
        `SELECT * FROM users WHERE email_address = ?`,
        credentials.emailAddress
      ).toArray();

      if (userResults.length === 0) {
        return {
          success: false,
          error: AuthError.INVALID_CREDENTIALS
        };
      }

      const userRecord = userResults[0] as unknown as UserRecord;
      
      // Verify password
      const passwordValid = await PasswordService.verifyPassword(
        credentials.password, 
        userRecord.password_hash
      );

      if (!passwordValid) {
        return {
          success: false,
          error: AuthError.INVALID_CREDENTIALS
        };
      }

      // Convert to User object
      const user: User = {
        id: userRecord.id,
        fullName: userRecord.full_name,
        emailAddress: userRecord.email_address,
        roles: JSON.parse(userRecord.roles || '["editor"]'), // Default to editor if no roles
        createdAt: userRecord.created_at,
        updatedAt: userRecord.updated_at
      };

      // Create session - always create one for testing subscription functionality
      let sessionToken = '';
      let expiresAt = '';

      // Force session creation for testing (rememberMe flag will determine duration)
      const sessionResult = await this.createSession(userRecord.id, credentials.rememberMe || false);
      if (sessionResult.success && sessionResult.sessionToken && sessionResult.expiresAt) {
        sessionToken = sessionResult.sessionToken;
        expiresAt = sessionResult.expiresAt;
      } else {
        console.error('Failed to create session:', sessionResult.error);
      }

      return {
        success: true,
        user,
        sessionToken: sessionToken || undefined,
        expiresAt: expiresAt || undefined
      };
    } catch (error) {
      console.error('User login error:', error);
      return {
        success: false,
        error: AuthError.INTERNAL_ERROR
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const results = await this.sql.exec(
        `SELECT * FROM users WHERE id = ?`,
        userId
      ).toArray();

      if (results.length === 0) {
        return null;
      }

      const userRecord = results[0] as unknown as UserRecord;
      return {
        id: userRecord.id,
        fullName: userRecord.full_name,
        emailAddress: userRecord.email_address,
        roles: JSON.parse(userRecord.roles || '["editor"]'), // Default to editor if no roles
        createdAt: userRecord.created_at,
        updatedAt: userRecord.updated_at
      };
    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(emailAddress: string): Promise<User | null> {
    try {
      const results = await this.sql.exec(
        `SELECT * FROM users WHERE email_address = ?`,
        emailAddress
      ).toArray();

      if (results.length === 0) {
        return null;
      }

      const userRecord = results[0] as unknown as UserRecord;
      return {
        id: userRecord.id,
        fullName: userRecord.full_name,
        emailAddress: userRecord.email_address,
        roles: JSON.parse(userRecord.roles || '["editor"]'), // Default to editor if no roles
        createdAt: userRecord.created_at,
        updatedAt: userRecord.updated_at
      };
    } catch (error) {
      console.error('Get user by email error:', error);
      return null;
    }
  }

  /**
   * Update user roles
   */
  async updateUserRoles(emailAddress: string, roles: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate roles
      const validRoles = ['guest', 'viewer', 'editor', 'admin'];
      const invalidRoles = roles.filter(role => !validRoles.includes(role));
      if (invalidRoles.length > 0) {
        return {
          success: false,
          error: `Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${validRoles.join(', ')}`
        };
      }

      // Check if user exists
      const user = await this.getUserByEmail(emailAddress);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Update roles
      const timestamp = this.getTimestamp();
      const rolesJson = JSON.stringify(roles);

      await this.sql.exec(
        `UPDATE users SET roles = ?, updated_at = ? WHERE email_address = ?`,
        rolesJson, timestamp, emailAddress
      );

      return { success: true };
    } catch (error) {
      console.error('Update user roles error:', error);
      return {
        success: false,
        error: AuthError.INTERNAL_ERROR
      };
    }
  }

  /**
   * Check if this is the first user in the system
   */
  async isFirstUser(): Promise<boolean> {
    try {
      const results = await this.sql.exec(
        `SELECT COUNT(*) as count FROM users`
      ).toArray();

      const count = (results[0] as any).count;
      return count === 0;
    } catch (error) {
      console.error('Check first user error:', error);
      return false;
    }
  }

  // ================== SESSION OPERATIONS ==================

  /**
   * Create a new session
   */
  async createSession(userId: string, rememberMe: boolean = false): Promise<LoginResult> {
    try {
      const sessionId = crypto.randomUUID();
      const sessionToken = PasswordService.generateSessionToken();
      const timestamp = this.getTimestamp();
      
      // Calculate expiration (30 days if rememberMe, 1 day otherwise)
      const expirationHours = rememberMe ? 720 : 24; // 720 hours = 30 days
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000)
        .toISOString().replace(/\.\d{3}Z$/, 'Z');

      await this.sql.exec(
        `INSERT INTO sessions (id, user_id, session_token, expires_at, remember_me, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        sessionId, userId, sessionToken, expiresAt, rememberMe ? 1 : 0, timestamp
      );

      return {
        success: true,
        sessionToken,
        expiresAt
      };
    } catch (error) {
      console.error('Session creation error:', error);
      return {
        success: false,
        error: AuthError.INTERNAL_ERROR
      };
    }
  }

  /**
   * Validate session token and return user
   */
  async validateSession(sessionToken: string): Promise<User | null> {
    try {
      const results = await this.sql.exec(
        `SELECT u.*, s.expires_at, s.remember_me 
         FROM users u 
         JOIN sessions s ON u.id = s.user_id 
         WHERE s.session_token = ? AND s.expires_at > ?`,
        sessionToken, this.getTimestamp()
      ).toArray();

      if (results.length === 0) {
        return null;
      }

      const userRecord = results[0] as unknown as UserRecord & { expires_at: string; remember_me: number };
      return {
        id: userRecord.id,
        fullName: userRecord.full_name,
        emailAddress: userRecord.email_address,
        roles: JSON.parse(userRecord.roles || '["editor"]'), // Default to editor if no roles
        createdAt: userRecord.created_at,
        updatedAt: userRecord.updated_at
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  /**
   * Delete session (logout)
   */
  async deleteSession(sessionToken: string): Promise<boolean> {
    try {
      await this.sql.exec(
        `DELETE FROM sessions WHERE session_token = ?`,
        sessionToken
      );
      return true;
    } catch (error) {
      console.error('Session deletion error:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.sql.exec(
        `DELETE FROM sessions WHERE expires_at <= ?`,
        this.getTimestamp()
      );
      
      // Return number of deleted sessions if available
      return (result as any).changes ?? 0;
    } catch (error) {
      console.error('Session cleanup error:', error);
      return 0;
    }
  }

  /**
   * Get session by token
   */
  async getSession(sessionToken: string): Promise<AuthSession | null> {
    try {
      const results = await this.sql.exec(
        `SELECT * FROM sessions WHERE session_token = ?`,
        sessionToken
      ).toArray();

      if (results.length === 0) {
        return null;
      }

      const sessionRecord = results[0] as unknown as SessionRecord;
      return {
        id: sessionRecord.id,
        userId: sessionRecord.user_id,
        sessionToken: sessionRecord.session_token,
        expiresAt: sessionRecord.expires_at,
        rememberMe: sessionRecord.remember_me === 1,
        createdAt: sessionRecord.created_at
      };
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  // ================== USER NOTIFICATION PREFERENCES ==================

  /**
   * Get user notification preferences
   */
  async getUserNotificationPreferences(userId: string): Promise<{
    success: boolean;
    preferences?: {
      retentionDays: number;
      showBreakingChangesOnly: boolean;
      emailDigestFrequency: 'never' | 'daily' | 'weekly';
      realTimeNotifications: boolean;
    };
    error?: string;
  }> {
    try {
      // First check if the user_notification_preferences table exists
      const tableCheckResult = await this.sql.exec(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='user_notification_preferences'
      `).toArray();

      if (tableCheckResult.length === 0) {
        console.log('User notification preferences: table does not exist, returning default preferences');
        // Return default preferences if table doesn't exist
        return {
          success: true,
          preferences: {
            retentionDays: 30,
            showBreakingChangesOnly: false,
            emailDigestFrequency: 'weekly',
            realTimeNotifications: true
          }
        };
      }

      // Get user preferences
      const preferencesResults = await this.sql.exec(
        `SELECT retention_days, show_breaking_changes_only, email_digest_frequency, real_time_notifications
         FROM user_notification_preferences WHERE user_id = ?`,
        userId
      ).toArray();

      if (preferencesResults.length === 0) {
        // User doesn't have preferences yet, return defaults
        return {
          success: true,
          preferences: {
            retentionDays: 30,
            showBreakingChangesOnly: false,
            emailDigestFrequency: 'weekly',
            realTimeNotifications: true
          }
        };
      }

      const prefs = preferencesResults[0] as any;
      return {
        success: true,
        preferences: {
          retentionDays: prefs.retention_days || 30,
          showBreakingChangesOnly: prefs.show_breaking_changes_only === 1,
          emailDigestFrequency: prefs.email_digest_frequency || 'weekly',
          realTimeNotifications: prefs.real_time_notifications === 1
        }
      };
    } catch (error) {
      console.error('Error getting user notification preferences:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserNotificationPreferences(userId: string, preferences: {
    retentionDays: number;
    showBreakingChangesOnly: boolean;
    emailDigestFrequency: 'never' | 'daily' | 'weekly';
    realTimeNotifications: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // First check if the user_notification_preferences table exists
      const tableCheckResult = await this.sql.exec(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='user_notification_preferences'
      `).toArray();

      if (tableCheckResult.length === 0) {
        console.log('User notification preferences: table does not exist, cannot update preferences');
        return { success: false, error: 'User notification preferences table not initialized' };
      }

      const timestamp = this.getTimestamp();

      // Use INSERT OR REPLACE to handle both insert and update cases
      await this.sql.exec(
        `INSERT OR REPLACE INTO user_notification_preferences
         (user_id, retention_days, show_breaking_changes_only, email_digest_frequency, real_time_notifications, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM user_notification_preferences WHERE user_id = ?), ?), ?)`,
        userId,
        preferences.retentionDays,
        preferences.showBreakingChangesOnly ? 1 : 0,
        preferences.emailDigestFrequency,
        preferences.realTimeNotifications ? 1 : 0,
        userId, // for COALESCE check
        timestamp, // default created_at if new record
        timestamp  // updated_at
      );

      return { success: true };
    } catch (error) {
      console.error('Error updating user notification preferences:', error);
      return { success: false, error: String(error) };
    }
  }
}