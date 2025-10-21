import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChangeNotifications, type ChangesSummary, type DetailedChange } from '../../src/hooks/useChangeNotifications';

// Mock dependencies
vi.mock('../../src/services/apiClient', () => ({
  apiClient: {
    getChangesSummary: vi.fn(),
    getDetailedChanges: vi.fn(),
    markChangesAsSeen: vi.fn()
  }
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../../src/services/realTimeManager', () => ({
  realTimeManager: {
    onMessage: vi.fn()
  }
}));

import { apiClient } from '../../src/services/apiClient';
import { useAuth } from '../../src/contexts/AuthContext';
import { realTimeManager } from '../../src/services/realTimeManager';

describe('useChangeNotifications', () => {
  // Mock data
  const mockSummary: ChangesSummary = {
    products: { new: 2, updated: 1, deleted: 0 },
    domains: { new: 1, updated: 0, deleted: 1 },
    contexts: { new: 0, updated: 2, deleted: 0 },
    schemas: { new: 3, updated: 1, deleted: 0 },
    schema_versions: { new: 1, updated: 0, deleted: 0 },
    totalChanges: 11
  };

  const mockDetailedChanges: DetailedChange[] = [
    {
      id: 'change-1',
      entityType: 'product',
      entityId: 'product-1',
      entityName: 'Test Product',
      changeType: 'created',
      changeData: { name: 'Test Product' },
      createdAt: '2023-01-01T10:00:00Z',
      changedByUserName: 'John Doe',
      changedByUserEmail: 'john@example.com'
    },
    {
      id: 'change-2',
      entityType: 'schema',
      entityId: 'schema-1',
      entityName: 'UserEvent',
      changeType: 'updated',
      changeData: { version: '2.0.0' },
      createdAt: '2023-01-01T11:00:00Z',
      isBreakingChange: true
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default API responses
    (apiClient.getChangesSummary as any).mockResolvedValue(mockSummary);
    (apiClient.getDetailedChanges as any).mockResolvedValue(mockDetailedChanges);
    (apiClient.markChangesAsSeen as any).mockResolvedValue(undefined);

    // Default realtime manager
    (realTimeManager.onMessage as any).mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default values when not authenticated', () => {
      // Mock unauthenticated state
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null
        }
      });

      const { result } = renderHook(() => useChangeNotifications());

      expect(result.current.summary).toBeNull();
      expect(result.current.detailedChanges).toEqual([]);
      expect(result.current.totalChangeCount).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Should not make API calls when not authenticated
      expect(apiClient.getChangesSummary).not.toHaveBeenCalled();
    });

    it('should fetch summary on mount when authenticated', async () => {
      // Mock authenticated state
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: {
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User'
          }
        }
      });

      const { result } = renderHook(() => useChangeNotifications());

      // Wait for the effect to run
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(apiClient.getChangesSummary).toHaveBeenCalledTimes(1);
      expect(result.current.summary).toEqual(mockSummary);
      expect(result.current.totalChangeCount).toBe(11);
      expect(result.current.isLoading).toBe(false);
    });

    it('should not fetch summary when not authenticated', async () => {
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null
        }
      });

      renderHook(() => useChangeNotifications());

      // Wait a moment and verify no calls were made
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(apiClient.getChangesSummary).not.toHaveBeenCalled();
    });
  });

  describe('API operations', () => {
    beforeEach(() => {
      // Mock authenticated state for API operation tests
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: {
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User'
          }
        }
      });
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      (apiClient.getChangesSummary as any).mockRejectedValue(error);

      const { result } = renderHook(() => useChangeNotifications());

      // Wait for the effect to run
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.error).toBe('API Error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should fetch detailed changes for specific entity type', async () => {
      const { result } = renderHook(() => useChangeNotifications());

      // Wait for initial setup
      await new Promise(resolve => setTimeout(resolve, 20));

      await act(async () => {
        await result.current.fetchDetailedChanges('product');
      });

      expect(apiClient.getDetailedChanges).toHaveBeenCalledWith('product');
      expect(result.current.detailedChanges).toEqual(mockDetailedChanges);
    });

    it('should not fetch detailed changes when not authenticated', async () => {
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null
        }
      });

      const { result } = renderHook(() => useChangeNotifications());

      await act(async () => {
        await result.current.fetchDetailedChanges('product');
      });

      expect(apiClient.getDetailedChanges).not.toHaveBeenCalled();
    });

    it('should fetch all detailed changes across entity types', async () => {
      const { result } = renderHook(() => useChangeNotifications());

      // Wait for initial setup
      await new Promise(resolve => setTimeout(resolve, 20));

      await act(async () => {
        await result.current.fetchAllDetailedChanges();
      });

      const expectedEntityTypes = ['product', 'domain', 'context', 'schema', 'schema_version'];
      expectedEntityTypes.forEach(entityType => {
        expect(apiClient.getDetailedChanges).toHaveBeenCalledWith(entityType);
      });

      // Should be called 5 times, once for each entity type
      expect(apiClient.getDetailedChanges).toHaveBeenCalledTimes(5);
    });

    it('should mark changes as seen and refresh', async () => {
      const { result } = renderHook(() => useChangeNotifications());

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      // First load the changes
      await act(async () => {
        await result.current.fetchDetailedChanges('product');
      });

      const changeIds = ['change-1', 'change-2'];

      await act(async () => {
        const success = await result.current.markChangesAsSeen(changeIds);
        expect(success).toBe(true);
      });

      expect(apiClient.markChangesAsSeen).toHaveBeenCalledWith(changeIds);
      // Should also trigger a refresh of the summary (initial + refresh)
      expect(apiClient.getChangesSummary).toHaveBeenCalledTimes(2);
    });

    it('should handle mark as seen failure', async () => {
      const error = new Error('Mark failed');
      (apiClient.markChangesAsSeen as any).mockRejectedValue(error);

      const { result } = renderHook(() => useChangeNotifications());

      // Wait for initial setup
      await new Promise(resolve => setTimeout(resolve, 20));

      await act(async () => {
        const success = await result.current.markChangesAsSeen(['change-1']);
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe('Mark failed');
    });

    it('should handle detailed changes API error gracefully', async () => {
      const error = new Error('Detailed changes error');
      (apiClient.getDetailedChanges as any).mockRejectedValue(error);

      const { result } = renderHook(() => useChangeNotifications());

      // Wait for initial setup
      await new Promise(resolve => setTimeout(resolve, 20));

      await act(async () => {
        await result.current.fetchDetailedChanges('product');
      });

      expect(result.current.error).toBe('Detailed changes error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle fetch all detailed changes with partial failures', async () => {
      // Mock some entity types to fail
      (apiClient.getDetailedChanges as any)
        .mockResolvedValueOnce(mockDetailedChanges)
        .mockRejectedValueOnce(new Error('Domain error'))
        .mockResolvedValueOnce(mockDetailedChanges)
        .mockRejectedValueOnce(new Error('Schema error'))
        .mockResolvedValueOnce(mockDetailedChanges);

      const { result } = renderHook(() => useChangeNotifications());

      // Wait for initial setup
      await new Promise(resolve => setTimeout(resolve, 20));

      await act(async () => {
        await result.current.fetchAllDetailedChanges();
      });

      // Should still succeed and return data from successful calls
      expect(result.current.detailedChanges.length).toBeGreaterThan(0);
      expect(result.current.isLoading).toBe(false);
      // Error should not be set as partial failures are handled gracefully
      expect(result.current.error).toBeNull();
    });
  });

  describe('real-time updates', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' }
        }
      });
    });

    it('should set up real-time message listener when authenticated', async () => {
      renderHook(() => useChangeNotifications());

      // Wait for the effect to run
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(realTimeManager.onMessage).toHaveBeenCalledTimes(1);
    });

    it('should not set up real-time listener when not authenticated', () => {
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null
        }
      });

      renderHook(() => useChangeNotifications());

      expect(realTimeManager.onMessage).not.toHaveBeenCalled();
    });

    it('should refresh summary on data change events', async () => {
      let messageHandler: any;
      (realTimeManager.onMessage as any).mockImplementation((handler) => {
        messageHandler = handler;
        return () => {}; // unsubscribe function
      });

      renderHook(() => useChangeNotifications());

      // Wait for initial setup
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(apiClient.getChangesSummary).toHaveBeenCalledTimes(1);

      // Simulate real-time message
      if (messageHandler) {
        act(() => {
          messageHandler({ type: 'product_created', data: {} });
        });

        // Wait for the handler to process
        await new Promise(resolve => setTimeout(resolve, 20));

        expect(apiClient.getChangesSummary).toHaveBeenCalledTimes(2);
      }
    });

    it('should refresh summary on subscription change events', async () => {
      let messageHandler: any;
      (realTimeManager.onMessage as any).mockImplementation((handler) => {
        messageHandler = handler;
        return () => {}; // unsubscribe function
      });

      renderHook(() => useChangeNotifications());

      // Wait for initial setup
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(apiClient.getChangesSummary).toHaveBeenCalledTimes(1);

      // Simulate subscription change message
      if (messageHandler) {
        act(() => {
          messageHandler({ type: 'user_subscribed', data: {} });
        });

        // Wait for the handler to process
        await new Promise(resolve => setTimeout(resolve, 20));

        expect(apiClient.getChangesSummary).toHaveBeenCalledTimes(2);
      }
    });

    it('should not refresh on unrelated message types', async () => {
      let messageHandler: any;
      (realTimeManager.onMessage as any).mockImplementation((handler) => {
        messageHandler = handler;
        return () => {}; // unsubscribe function
      });

      renderHook(() => useChangeNotifications());

      // Wait for initial setup
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(apiClient.getChangesSummary).toHaveBeenCalledTimes(1);

      // Simulate unrelated message
      if (messageHandler) {
        act(() => {
          messageHandler({ type: 'unrelated_message', data: {} });
        });

        // Should not trigger additional API calls
        expect(apiClient.getChangesSummary).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('hook return values', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' }
        }
      });
    });

    it('should provide all expected methods and properties', async () => {
      const { result } = renderHook(() => useChangeNotifications());

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      // Check all expected properties exist
      expect(result.current).toHaveProperty('summary');
      expect(result.current).toHaveProperty('detailedChanges');
      expect(result.current).toHaveProperty('totalChangeCount');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('fetchSummary');
      expect(result.current).toHaveProperty('fetchDetailedChanges');
      expect(result.current).toHaveProperty('fetchAllDetailedChanges');
      expect(result.current).toHaveProperty('markChangesAsSeen');
      expect(result.current).toHaveProperty('refresh');

      // Check methods are functions
      expect(typeof result.current.fetchSummary).toBe('function');
      expect(typeof result.current.fetchDetailedChanges).toBe('function');
      expect(typeof result.current.fetchAllDetailedChanges).toBe('function');
      expect(typeof result.current.markChangesAsSeen).toBe('function');
      expect(typeof result.current.refresh).toBe('function');

      // Check refresh is same as fetchSummary
      expect(result.current.refresh).toBe(result.current.fetchSummary);
    });

    it('should calculate total change count correctly', async () => {
      const { result } = renderHook(() => useChangeNotifications());

      // Wait for data to load
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.totalChangeCount).toBe(11);
    });

    it('should return 0 total count when summary is null', () => {
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null
        }
      });

      const { result } = renderHook(() => useChangeNotifications());

      expect(result.current.totalChangeCount).toBe(0);
    });
  });

  describe('authentication state changes', () => {
    it('should fetch summary when authentication state changes to authenticated', async () => {
      // Start unauthenticated
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null
        }
      });

      const { rerender } = renderHook(() => useChangeNotifications());

      await new Promise(resolve => setTimeout(resolve, 20));
      expect(apiClient.getChangesSummary).not.toHaveBeenCalled();

      // Change to authenticated
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' }
        }
      });

      rerender();

      // Wait for the new effect to run
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(apiClient.getChangesSummary).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' }
        }
      });
    });

    it('should handle non-Error objects in catch blocks', async () => {
      (apiClient.getChangesSummary as any).mockRejectedValue('string error');

      const { result } = renderHook(() => useChangeNotifications());

      // Wait for the effect to run
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.error).toBe('Unknown error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle null/undefined errors', async () => {
      (apiClient.getChangesSummary as any).mockRejectedValue(null);

      const { result } = renderHook(() => useChangeNotifications());

      // Wait for the effect to run
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.error).toBe('Unknown error');
      expect(result.current.isLoading).toBe(false);
    });
  });
});