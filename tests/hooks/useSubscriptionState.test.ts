import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSubscriptionState, type Subscription, type EntityType } from '../../src/hooks/useSubscriptionState';

// Mock apiClient
vi.mock('../../src/services/apiClient', () => ({
  apiClient: {
    getSubscriptions: vi.fn(),
    isSubscribed: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn()
  }
}));

import { apiClient } from '../../src/services/apiClient';

describe('useSubscriptionState', () => {
  // Mock data
  const mockSubscriptions: Subscription[] = [
    {
      id: 'sub-1',
      typeId: 'product-1',
      type: 'P',
      createdAt: '2023-01-01T10:00:00Z'
    },
    {
      id: 'sub-2',
      typeId: 'domain-1',
      type: 'D',
      createdAt: '2023-01-01T11:00:00Z'
    },
    {
      id: 'sub-3',
      typeId: 'context-1',
      type: 'C',
      createdAt: '2023-01-01T12:00:00Z'
    }
  ];

  const mockSubscriptionResponse = {
    subscriptions: mockSubscriptions
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default API responses
    (apiClient.getSubscriptions as any).mockResolvedValue(mockSubscriptionResponse);
    (apiClient.isSubscribed as any).mockResolvedValue({ isSubscribed: true });
    (apiClient.subscribe as any).mockResolvedValue({ subscriptionId: 'new-sub-id' });
    (apiClient.unsubscribe as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default values when not authenticated', () => {
      const { result } = renderHook(() => useSubscriptionState(false));

      expect(result.current.subscriptions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Should not make API calls when not authenticated
      expect(apiClient.getSubscriptions).not.toHaveBeenCalled();
    });

    it('should load subscriptions on mount when authenticated', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for the effect to run
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(apiClient.getSubscriptions).toHaveBeenCalledTimes(1);
      expect(result.current.subscriptions).toEqual(mockSubscriptions);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should clear subscriptions when authentication changes to false', async () => {
      const { result, rerender } = renderHook(
        ({ isAuthenticated }) => useSubscriptionState(isAuthenticated),
        { initialProps: { isAuthenticated: true } }
      );

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(result.current.subscriptions).toEqual(mockSubscriptions);

      // Change to unauthenticated
      rerender({ isAuthenticated: false });

      expect(result.current.subscriptions).toEqual([]);
    });

    it('should reload subscriptions when authentication changes to true', async () => {
      const { result, rerender } = renderHook(
        ({ isAuthenticated }) => useSubscriptionState(isAuthenticated),
        { initialProps: { isAuthenticated: false } }
      );

      expect(result.current.subscriptions).toEqual([]);
      expect(apiClient.getSubscriptions).not.toHaveBeenCalled();

      // Change to authenticated
      rerender({ isAuthenticated: true });

      // Wait for the effect to run
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(apiClient.getSubscriptions).toHaveBeenCalledTimes(1);
      expect(result.current.subscriptions).toEqual(mockSubscriptions);
    });
  });

  describe('refreshSubscriptions', () => {
    it('should refresh subscriptions when authenticated', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      // Call refresh manually
      await act(async () => {
        await result.current.refreshSubscriptions();
      });

      expect(apiClient.getSubscriptions).toHaveBeenCalledTimes(2); // Initial + refresh
      expect(result.current.subscriptions).toEqual(mockSubscriptions);
    });

    it('should not refresh subscriptions when not authenticated', async () => {
      const { result } = renderHook(() => useSubscriptionState(false));

      await act(async () => {
        await result.current.refreshSubscriptions();
      });

      expect(apiClient.getSubscriptions).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      (apiClient.getSubscriptions as any).mockRejectedValue(error);

      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for the effect to run
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.error).toBe('API Error');
      expect(result.current.subscriptions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle non-Error objects in catch blocks', async () => {
      (apiClient.getSubscriptions as any).mockRejectedValue('string error');

      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for the effect to run
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.error).toBe('Failed to load subscriptions');
      expect(result.current.subscriptions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle empty subscriptions response', async () => {
      (apiClient.getSubscriptions as any).mockResolvedValue({ subscriptions: null });

      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for the effect to run
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.subscriptions).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('isSubscribed', () => {
    it('should correctly identify subscribed entities', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.isSubscribed('product-1', 'P')).toBe(true);
      expect(result.current.isSubscribed('domain-1', 'D')).toBe(true);
      expect(result.current.isSubscribed('context-1', 'C')).toBe(true);
    });

    it('should return false for non-subscribed entities', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.isSubscribed('product-999', 'P')).toBe(false);
      expect(result.current.isSubscribed('domain-999', 'D')).toBe(false);
      expect(result.current.isSubscribed('context-999', 'C')).toBe(false);
    });

    it('should return false for wrong entity type', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      // product-1 exists as type 'P', but checking as type 'D'
      expect(result.current.isSubscribed('product-1', 'D')).toBe(false);
      expect(result.current.isSubscribed('domain-1', 'C')).toBe(false);
      expect(result.current.isSubscribed('context-1', 'P')).toBe(false);
    });

    it('should return false when no subscriptions are loaded', () => {
      const { result } = renderHook(() => useSubscriptionState(false));

      expect(result.current.isSubscribed('product-1', 'P')).toBe(false);
      expect(result.current.isSubscribed('domain-1', 'D')).toBe(false);
      expect(result.current.isSubscribed('context-1', 'C')).toBe(false);
    });
  });

  describe('checkSubscriptionStatus', () => {
    it('should check subscription status from server when authenticated', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      await act(async () => {
        const isSubscribed = await result.current.checkSubscriptionStatus('product-1', 'P');
        expect(isSubscribed).toBe(true);
      });

      expect(apiClient.isSubscribed).toHaveBeenCalledWith('product-1', 'P');
    });

    it('should return false when not authenticated', async () => {
      const { result } = renderHook(() => useSubscriptionState(false));

      await act(async () => {
        const isSubscribed = await result.current.checkSubscriptionStatus('product-1', 'P');
        expect(isSubscribed).toBe(false);
      });

      expect(apiClient.isSubscribed).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('Check failed');
      (apiClient.isSubscribed as any).mockRejectedValue(error);

      const { result } = renderHook(() => useSubscriptionState(true));

      await act(async () => {
        const isSubscribed = await result.current.checkSubscriptionStatus('product-1', 'P');
        expect(isSubscribed).toBe(false);
      });

      expect(apiClient.isSubscribed).toHaveBeenCalledWith('product-1', 'P');
    });

    it('should handle different entity types correctly', async () => {
      (apiClient.isSubscribed as any)
        .mockResolvedValueOnce({ isSubscribed: true })
        .mockResolvedValueOnce({ isSubscribed: false })
        .mockResolvedValueOnce({ isSubscribed: true });

      const { result } = renderHook(() => useSubscriptionState(true));

      await act(async () => {
        expect(await result.current.checkSubscriptionStatus('product-1', 'P')).toBe(true);
        expect(await result.current.checkSubscriptionStatus('domain-1', 'D')).toBe(false);
        expect(await result.current.checkSubscriptionStatus('context-1', 'C')).toBe(true);
      });

      expect(apiClient.isSubscribed).toHaveBeenCalledTimes(3);
      expect(apiClient.isSubscribed).toHaveBeenCalledWith('product-1', 'P');
      expect(apiClient.isSubscribed).toHaveBeenCalledWith('domain-1', 'D');
      expect(apiClient.isSubscribed).toHaveBeenCalledWith('context-1', 'C');
    });
  });

  describe('subscribe', () => {
    it('should subscribe to an entity when authenticated', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      await act(async () => {
        await result.current.subscribe('product-2', 'P');
      });

      expect(apiClient.subscribe).toHaveBeenCalledWith('product-2', 'P');

      // Should add to local state
      const newSubscription = result.current.subscriptions.find(
        sub => sub.typeId === 'product-2' && sub.type === 'P'
      );
      expect(newSubscription).toBeDefined();
      expect(newSubscription?.id).toBe('new-sub-id');
    });

    it('should throw error when not authenticated', async () => {
      const { result } = renderHook(() => useSubscriptionState(false));

      await act(async () => {
        await expect(result.current.subscribe('product-2', 'P')).rejects.toThrow(
          'You must be logged in to subscribe'
        );
      });

      expect(apiClient.subscribe).not.toHaveBeenCalled();
    });

    it('should handle API errors and re-throw them', async () => {
      const error = new Error('Subscribe failed');
      (apiClient.subscribe as any).mockRejectedValue(error);

      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      await act(async () => {
        await expect(result.current.subscribe('product-2', 'P')).rejects.toThrow('Subscribe failed');
      });

      expect(result.current.error).toBe('Subscribe failed');
      expect(apiClient.subscribe).toHaveBeenCalledWith('product-2', 'P');
    });

    it('should not add duplicate subscriptions', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      const initialCount = result.current.subscriptions.length;

      // Try to subscribe to an entity that's already subscribed (product-1 exists in mock data)
      await act(async () => {
        await result.current.subscribe('product-1', 'P');
      });

      // Should not add duplicate
      expect(result.current.subscriptions.length).toBe(initialCount);
    });

    it('should handle non-Error objects in catch blocks', async () => {
      (apiClient.subscribe as any).mockRejectedValue('string error');

      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      await act(async () => {
        await expect(result.current.subscribe('product-2', 'P')).rejects.toBe('string error');
      });

      expect(result.current.error).toBe('Failed to subscribe');
    });

    it('should handle all entity types correctly', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      // Subscribe to different entity types
      await act(async () => {
        await result.current.subscribe('product-new', 'P');
      });

      await act(async () => {
        await result.current.subscribe('domain-new', 'D');
      });

      await act(async () => {
        await result.current.subscribe('context-new', 'C');
      });

      expect(apiClient.subscribe).toHaveBeenCalledTimes(3);
      expect(apiClient.subscribe).toHaveBeenCalledWith('product-new', 'P');
      expect(apiClient.subscribe).toHaveBeenCalledWith('domain-new', 'D');
      expect(apiClient.subscribe).toHaveBeenCalledWith('context-new', 'C');

      // Check all were added to state
      expect(result.current.isSubscribed('product-new', 'P')).toBe(true);
      expect(result.current.isSubscribed('domain-new', 'D')).toBe(true);
      expect(result.current.isSubscribed('context-new', 'C')).toBe(true);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from an entity when authenticated', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.isSubscribed('product-1', 'P')).toBe(true);

      await act(async () => {
        await result.current.unsubscribe('product-1', 'P');
      });

      expect(apiClient.unsubscribe).toHaveBeenCalledWith('product-1', 'P');

      // Should remove from local state
      expect(result.current.isSubscribed('product-1', 'P')).toBe(false);
    });

    it('should throw error when not authenticated', async () => {
      const { result } = renderHook(() => useSubscriptionState(false));

      await act(async () => {
        await expect(result.current.unsubscribe('product-1', 'P')).rejects.toThrow(
          'You must be logged in to unsubscribe'
        );
      });

      expect(apiClient.unsubscribe).not.toHaveBeenCalled();
    });

    it('should handle API errors and re-throw them', async () => {
      const error = new Error('Unsubscribe failed');
      (apiClient.unsubscribe as any).mockRejectedValue(error);

      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      await act(async () => {
        await expect(result.current.unsubscribe('product-1', 'P')).rejects.toThrow('Unsubscribe failed');
      });

      expect(result.current.error).toBe('Unsubscribe failed');
      expect(apiClient.unsubscribe).toHaveBeenCalledWith('product-1', 'P');
    });

    it('should handle non-Error objects in catch blocks', async () => {
      (apiClient.unsubscribe as any).mockRejectedValue('string error');

      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      await act(async () => {
        await expect(result.current.unsubscribe('product-1', 'P')).rejects.toBe('string error');
      });

      expect(result.current.error).toBe('Failed to unsubscribe');
    });

    it('should handle unsubscribing from non-existent subscriptions gracefully', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      const initialCount = result.current.subscriptions.length;

      // Try to unsubscribe from something not subscribed to
      await act(async () => {
        await result.current.unsubscribe('product-999', 'P');
      });

      expect(apiClient.unsubscribe).toHaveBeenCalledWith('product-999', 'P');
      // Should not change the count
      expect(result.current.subscriptions.length).toBe(initialCount);
    });

    it('should handle all entity types correctly', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      // Unsubscribe from different entity types
      await act(async () => {
        await result.current.unsubscribe('product-1', 'P');
      });

      await act(async () => {
        await result.current.unsubscribe('domain-1', 'D');
      });

      await act(async () => {
        await result.current.unsubscribe('context-1', 'C');
      });

      expect(apiClient.unsubscribe).toHaveBeenCalledTimes(3);
      expect(apiClient.unsubscribe).toHaveBeenCalledWith('product-1', 'P');
      expect(apiClient.unsubscribe).toHaveBeenCalledWith('domain-1', 'D');
      expect(apiClient.unsubscribe).toHaveBeenCalledWith('context-1', 'C');

      // Check all were removed from state
      expect(result.current.isSubscribed('product-1', 'P')).toBe(false);
      expect(result.current.isSubscribed('domain-1', 'D')).toBe(false);
      expect(result.current.isSubscribed('context-1', 'C')).toBe(false);
    });
  });

  describe('hook return values', () => {
    it('should provide all expected methods and properties', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      // Check all expected properties exist
      expect(result.current).toHaveProperty('subscriptions');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isSubscribed');
      expect(result.current).toHaveProperty('subscribe');
      expect(result.current).toHaveProperty('unsubscribe');
      expect(result.current).toHaveProperty('checkSubscriptionStatus');
      expect(result.current).toHaveProperty('refreshSubscriptions');

      // Check methods are functions
      expect(typeof result.current.isSubscribed).toBe('function');
      expect(typeof result.current.subscribe).toBe('function');
      expect(typeof result.current.unsubscribe).toBe('function');
      expect(typeof result.current.checkSubscriptionStatus).toBe('function');
      expect(typeof result.current.refreshSubscriptions).toBe('function');

      // Check data properties
      expect(Array.isArray(result.current.subscriptions)).toBe(true);
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(result.current.error === null || typeof result.current.error === 'string').toBe(true);
    });

    it('should maintain consistent subscription array structure', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      result.current.subscriptions.forEach(subscription => {
        expect(subscription).toHaveProperty('id');
        expect(subscription).toHaveProperty('typeId');
        expect(subscription).toHaveProperty('type');
        expect(subscription).toHaveProperty('createdAt');

        expect(typeof subscription.id).toBe('string');
        expect(typeof subscription.typeId).toBe('string');
        expect(['P', 'D', 'C']).toContain(subscription.type);
        expect(typeof subscription.createdAt).toBe('string');
      });
    });
  });

  describe('state consistency', () => {
    it('should maintain state consistency during rapid operations', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      const initialCount = result.current.subscriptions.length;

      // Perform rapid subscribe/unsubscribe operations
      await act(async () => {
        await result.current.subscribe('test-1', 'P');
        await result.current.subscribe('test-2', 'P');
        await result.current.unsubscribe('test-1', 'P');
      });

      expect(result.current.subscriptions.length).toBe(initialCount + 1);
      expect(result.current.isSubscribed('test-1', 'P')).toBe(false);
      expect(result.current.isSubscribed('test-2', 'P')).toBe(true);
    });

    it('should handle concurrent subscribe operations correctly', async () => {
      const { result } = renderHook(() => useSubscriptionState(true));

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 20));

      // Simulate concurrent operations
      await act(async () => {
        await Promise.all([
          result.current.subscribe('concurrent-1', 'P'),
          result.current.subscribe('concurrent-2', 'D'),
          result.current.subscribe('concurrent-3', 'C')
        ]);
      });

      expect(result.current.isSubscribed('concurrent-1', 'P')).toBe(true);
      expect(result.current.isSubscribed('concurrent-2', 'D')).toBe(true);
      expect(result.current.isSubscribed('concurrent-3', 'C')).toBe(true);
    });
  });
});