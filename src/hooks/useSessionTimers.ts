/**
 * Custom hook for session timer management
 * Handles session expiration, warnings, and activity-based extension
 */

import { useEffect, useRef, useState } from 'react';
import { SessionManager } from '../services/sessionManager';

interface UseSessionTimersParams {
  isAuthenticated: boolean;
  onSessionExpired?: () => void;
  onSessionWarning?: () => void;
}

export const useSessionTimers = ({
  isAuthenticated,
  onSessionExpired,
  onSessionWarning
}: UseSessionTimersParams) => {
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null);
  const sessionManagerRef = useRef<SessionManager | null>(null);
  const onLogoutRef = useRef<(() => Promise<void>) | null>(null);

  // Initialize SessionManager
  if (!sessionManagerRef.current) {
    sessionManagerRef.current = new SessionManager({
      onSessionExpired: async () => {
        if (onLogoutRef.current) {
          await onLogoutRef.current();
        }
        if (onSessionExpired) {
          onSessionExpired();
        }
      },
      onSessionWarning: () => {
        if (onSessionWarning) {
          onSessionWarning();
        }
      }
    });
  }

  const sessionManager = sessionManagerRef.current;

  /**
   * Set the logout callback (to be called from parent component)
   */
  const setLogoutCallback = (callback: () => Promise<void>): void => {
    onLogoutRef.current = callback;
  };

  // Update sessionExpiresAt periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const expiresAt = sessionManager.getSessionExpiresAt();
      setSessionExpiresAt(prev => {
        const prevTime = prev?.getTime();
        const newTime = expiresAt?.getTime();
        // Only update if actually changed
        if (prevTime !== newTime) {
          return expiresAt;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Set up activity listeners for session extension
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const handleActivity = () => {
      if (!sessionManager.isRememberMeSession()) {
        sessionManager.extendSession();
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
    };
  }, [isAuthenticated]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      sessionManager.clearTimers();
    };
  }, []);

  /**
   * Extend the current session
   */
  const extendSession = (): void => {
    sessionManager.extendSession();
  };

  /**
   * Check if session is expiring soon
   */
  const isSessionExpiringSoon = (): boolean => {
    return sessionManager.isSessionExpiringSoon();
  };

  return {
    sessionManager,
    sessionExpiresAt,
    extendSession,
    isSessionExpiringSoon,
    setLogoutCallback,
  };
};
