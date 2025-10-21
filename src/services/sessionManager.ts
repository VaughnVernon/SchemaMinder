/**
 * Session management service
 * Handles session timers, expiration, and "remember me" functionality
 */

// Session timeout in milliseconds (30 minutes by default)
const SESSION_TIMEOUT = 30 * 60 * 1000;
const SESSION_WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout
const REMEMBER_ME_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionCallbacks {
  onSessionExpired?: () => void;
  onSessionWarning?: () => void;
}

export class SessionManager {
  private sessionTimerRef: NodeJS.Timeout | null = null;
  private warningTimerRef: NodeJS.Timeout | null = null;
  private sessionExpiresAt: Date | null = null;
  private callbacks: SessionCallbacks;

  constructor(callbacks: SessionCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Get current session expiration time
   */
  getSessionExpiresAt(): Date | null {
    return this.sessionExpiresAt;
  }

  /**
   * Clear all session timers
   */
  clearTimers(): void {
    if (this.sessionTimerRef) {
      clearTimeout(this.sessionTimerRef);
      this.sessionTimerRef = null;
    }
    if (this.warningTimerRef) {
      clearTimeout(this.warningTimerRef);
      this.warningTimerRef = null;
    }
    this.sessionExpiresAt = null;
  }

  /**
   * Set up session timers based on remember me preference
   */
  setupTimers(rememberMe: boolean = false): void {
    this.clearTimers();

    if (!rememberMe) {
      // Standard session with timeout and warning
      const expiresAt = new Date(Date.now() + SESSION_TIMEOUT);
      this.sessionExpiresAt = expiresAt;

      // Set warning timer
      this.warningTimerRef = setTimeout(() => {
        if (this.callbacks.onSessionWarning) {
          this.callbacks.onSessionWarning();
        }
      }, SESSION_TIMEOUT - SESSION_WARNING_TIME);

      // Set expiration timer
      this.sessionTimerRef = setTimeout(() => {
        if (this.callbacks.onSessionExpired) {
          this.callbacks.onSessionExpired();
        }
      }, SESSION_TIMEOUT);
    } else {
      // Extended session for "remember me"
      const expiresAt = new Date(Date.now() + REMEMBER_ME_DURATION);
      this.sessionExpiresAt = expiresAt;
    }
  }

  /**
   * Extend the current session (resets timers)
   */
  extendSession(): void {
    if (!this.isRememberMeSession()) {
      this.setupTimers(false);
    }
  }

  /**
   * Check if session is expiring soon
   */
  isSessionExpiringSoon(): boolean {
    if (!this.sessionExpiresAt) return false;
    const timeUntilExpiry = this.sessionExpiresAt.getTime() - Date.now();
    return timeUntilExpiry > 0 && timeUntilExpiry <= SESSION_WARNING_TIME;
  }

  /**
   * Check if current session is a "remember me" session
   */
  isRememberMeSession(): boolean {
    return localStorage.getItem('rememberMe') === 'true';
  }

  /**
   * Set remember me preference
   */
  setRememberMe(rememberMe: boolean): void {
    localStorage.setItem('rememberMe', rememberMe.toString());
  }

  /**
   * Clear remember me preference
   */
  clearRememberMe(): void {
    localStorage.removeItem('rememberMe');
  }

  /**
   * Get remember me preference
   */
  getRememberMe(): boolean {
    return this.isRememberMeSession();
  }
}
