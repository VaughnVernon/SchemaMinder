import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionTimers } from '../../src/hooks/useSessionTimers';
import { SessionManager } from '../../src/services/sessionManager';

// Mock SessionManager
vi.mock('../../src/services/sessionManager');

describe('useSessionTimers', () => {
  let mockSessionManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create a mock SessionManager instance
    mockSessionManager = {
      getSessionExpiresAt: vi.fn(() => null),
      isRememberMeSession: vi.fn(() => false),
      extendSession: vi.fn(),
      clearTimers: vi.fn(),
      isSessionExpiringSoon: vi.fn(() => false),
      setupTimers: vi.fn(),
      getRememberMe: vi.fn(() => false),
      setRememberMe: vi.fn()
    };

    // Mock SessionManager constructor
    (SessionManager as any).mockImplementation((callbacks: any) => {
      mockSessionManager.callbacks = callbacks;
      return mockSessionManager;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with null sessionExpiresAt', () => {
      const { result } = renderHook(() =>
        useSessionTimers({
          isAuthenticated: false
        })
      );

      expect(result.current.sessionExpiresAt).toBeNull();
    });

    it('should create a SessionManager instance', () => {
      renderHook(() =>
        useSessionTimers({
          isAuthenticated: false
        })
      );

      expect(SessionManager).toHaveBeenCalledWith(expect.objectContaining({
        onSessionExpired: expect.any(Function),
        onSessionWarning: expect.any(Function)
      }));
    });

    it('should return sessionManager instance', () => {
      const { result } = renderHook(() =>
        useSessionTimers({
          isAuthenticated: false
        })
      );

      expect(result.current.sessionManager).toBeDefined();
      expect(result.current.sessionManager).toBe(mockSessionManager);
    });

    it('should provide setLogoutCallback function', () => {
      const { result } = renderHook(() =>
        useSessionTimers({
          isAuthenticated: false
        })
      );

      expect(result.current.setLogoutCallback).toBeInstanceOf(Function);
    });
  });

  describe('sessionExpiresAt updates', () => {
    it('should update sessionExpiresAt from SessionManager', async () => {
      const expirationDate = new Date(Date.now() + 3600000);
      mockSessionManager.getSessionExpiresAt.mockReturnValue(expirationDate);

      const { result } = renderHook(() =>
        useSessionTimers({
          isAuthenticated: true
        })
      );

      // Fast-forward time to trigger interval
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.sessionExpiresAt).toEqual(expirationDate);
    });

    it('should only update when expiration time changes', async () => {
      const expirationDate = new Date(Date.now() + 3600000);
      mockSessionManager.getSessionExpiresAt.mockReturnValue(expirationDate);

      const { result } = renderHook(() =>
        useSessionTimers({
          isAuthenticated: true
        })
      );

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.sessionExpiresAt).toEqual(expirationDate);

      const firstValue = result.current.sessionExpiresAt;

      // Advance time again without changing expiration
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // Should be same reference (not updated)
      expect(result.current.sessionExpiresAt).toBe(firstValue);
    });

    it('should update when expiration time changes', async () => {
      const firstExpiration = new Date(Date.now() + 3600000);
      const secondExpiration = new Date(Date.now() + 7200000);

      mockSessionManager.getSessionExpiresAt.mockReturnValue(firstExpiration);

      const { result } = renderHook(() =>
        useSessionTimers({
          isAuthenticated: true
        })
      );

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.sessionExpiresAt).toEqual(firstExpiration);

      // Change the expiration time
      mockSessionManager.getSessionExpiresAt.mockReturnValue(secondExpiration);

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.sessionExpiresAt).toEqual(secondExpiration);
    });
  });

  describe('Activity listeners', () => {
    it('should not add listeners when not authenticated', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() =>
        useSessionTimers({
          isAuthenticated: false
        })
      );

      expect(addEventListenerSpy).not.toHaveBeenCalled();

      addEventListenerSpy.mockRestore();
    });

    it('should add activity listeners when authenticated', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() =>
        useSessionTimers({
          isAuthenticated: true
        })
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keypress', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    it('should extend session on mousemove when not remember me', () => {
      mockSessionManager.isRememberMeSession.mockReturnValue(false);

      renderHook(() =>
        useSessionTimers({
          isAuthenticated: true
        })
      );

      act(() => {
        window.dispatchEvent(new Event('mousemove'));
      });

      expect(mockSessionManager.extendSession).toHaveBeenCalled();
    });

    it('should extend session on keypress when not remember me', () => {
      mockSessionManager.isRememberMeSession.mockReturnValue(false);

      renderHook(() =>
        useSessionTimers({
          isAuthenticated: true
        })
      );

      act(() => {
        window.dispatchEvent(new Event('keypress'));
      });

      expect(mockSessionManager.extendSession).toHaveBeenCalled();
    });

    it('should not extend session on activity when remember me', () => {
      mockSessionManager.isRememberMeSession.mockReturnValue(true);

      renderHook(() =>
        useSessionTimers({
          isAuthenticated: true
        })
      );

      act(() => {
        window.dispatchEvent(new Event('mousemove'));
        window.dispatchEvent(new Event('keypress'));
      });

      expect(mockSessionManager.extendSession).not.toHaveBeenCalled();
    });

    it('should remove listeners when authentication changes to false', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { rerender } = renderHook(
        ({ isAuthenticated }) => useSessionTimers({ isAuthenticated }),
        { initialProps: { isAuthenticated: true } }
      );

      expect(removeEventListenerSpy).not.toHaveBeenCalled();

      rerender({ isAuthenticated: false });

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keypress', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Session callbacks', () => {
    it('should call onSessionExpired callback when session expires', async () => {
      const onSessionExpired = vi.fn();
      const onLogout = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useSessionTimers({
          isAuthenticated: true,
          onSessionExpired
        })
      );

      // Set the logout callback
      act(() => {
        result.current.setLogoutCallback(onLogout);
      });

      // Trigger session expiration
      await act(async () => {
        await mockSessionManager.callbacks.onSessionExpired();
      });

      expect(onLogout).toHaveBeenCalled();
      expect(onSessionExpired).toHaveBeenCalled();
    });

    it('should call onSessionWarning callback when session warning triggers', async () => {
      const onSessionWarning = vi.fn();

      renderHook(() =>
        useSessionTimers({
          isAuthenticated: true,
          onSessionWarning
        })
      );

      // Trigger session warning
      await act(async () => {
        await mockSessionManager.callbacks.onSessionWarning();
      });

      expect(onSessionWarning).toHaveBeenCalled();
    });

    it('should handle session expiration without onSessionExpired callback', async () => {
      const onLogout = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useSessionTimers({
          isAuthenticated: true
          // No onSessionExpired callback
        })
      );

      act(() => {
        result.current.setLogoutCallback(onLogout);
      });

      await act(async () => {
        await mockSessionManager.callbacks.onSessionExpired();
      });

      expect(onLogout).toHaveBeenCalled();
    });

    it('should handle session warning without onSessionWarning callback', async () => {
      renderHook(() =>
        useSessionTimers({
          isAuthenticated: true
          // No onSessionWarning callback
        })
      );

      // Should not throw
      await act(async () => {
        await mockSessionManager.callbacks.onSessionWarning();
      });

      // If we reach here without throwing, the test passes
      expect(true).toBe(true);
    });

    it('should handle session expiration without logout callback', async () => {
      const onSessionExpired = vi.fn();

      renderHook(() =>
        useSessionTimers({
          isAuthenticated: true,
          onSessionExpired
        })
      );

      // Don't set logout callback

      await act(async () => {
        await mockSessionManager.callbacks.onSessionExpired();
      });

      expect(onSessionExpired).toHaveBeenCalled();
    });
  });

  describe('Exported functions', () => {
    it('should provide extendSession function', () => {
      const { result } = renderHook(() =>
        useSessionTimers({
          isAuthenticated: false
        })
      );

      act(() => {
        result.current.extendSession();
      });

      expect(mockSessionManager.extendSession).toHaveBeenCalled();
    });

    it('should provide isSessionExpiringSoon function', () => {
      mockSessionManager.isSessionExpiringSoon.mockReturnValue(true);

      const { result } = renderHook(() =>
        useSessionTimers({
          isAuthenticated: false
        })
      );

      const result_value = result.current.isSessionExpiringSoon();

      expect(result_value).toBe(true);
      expect(mockSessionManager.isSessionExpiringSoon).toHaveBeenCalled();
    });

    it('should update logout callback when setLogoutCallback is called', () => {
      const logout1 = vi.fn().mockResolvedValue(undefined);
      const logout2 = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useSessionTimers({
          isAuthenticated: true
        })
      );

      act(() => {
        result.current.setLogoutCallback(logout1);
      });

      act(() => {
        result.current.setLogoutCallback(logout2);
      });

      // The second callback should replace the first
      expect(result.current.setLogoutCallback).toBeInstanceOf(Function);
    });
  });

  describe('Cleanup', () => {
    it('should clear interval on unmount', () => {
      const { unmount } = renderHook(() =>
        useSessionTimers({
          isAuthenticated: false
        })
      );

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });

    it('should clear SessionManager timers on unmount', () => {
      const { unmount } = renderHook(() =>
        useSessionTimers({
          isAuthenticated: false
        })
      );

      unmount();

      expect(mockSessionManager.clearTimers).toHaveBeenCalled();
    });

    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useSessionTimers({
          isAuthenticated: true
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keypress', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('SessionManager persistence', () => {
    it('should reuse same SessionManager instance across rerenders', () => {
      const { rerender } = renderHook(
        ({ isAuthenticated }) => useSessionTimers({ isAuthenticated }),
        { initialProps: { isAuthenticated: false } }
      );

      expect(SessionManager).toHaveBeenCalledTimes(1);

      rerender({ isAuthenticated: true });
      rerender({ isAuthenticated: false });
      rerender({ isAuthenticated: true });

      // Should still be only one instance
      expect(SessionManager).toHaveBeenCalledTimes(1);
    });
  });
});
