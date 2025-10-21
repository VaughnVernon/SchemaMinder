import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';

export type EntityType = 'P' | 'D' | 'C'; // Product, Domain, Context

export interface Subscription {
  id: string;
  typeId: string;
  type: EntityType;
  createdAt: string;
}

interface SubscriptionState {
  subscriptions: Subscription[];
  isLoading: boolean;
  error: string | null;
  isSubscribed: (typeId: string, type: EntityType) => boolean;
  subscribe: (typeId: string, type: EntityType) => Promise<void>;
  unsubscribe: (typeId: string, type: EntityType) => Promise<void>;
  checkSubscriptionStatus: (typeId: string, type: EntityType) => Promise<boolean>;
  refreshSubscriptions: () => Promise<void>;
}

export const useSubscriptionState = (isAuthenticated: boolean): SubscriptionState => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all user subscriptions on mount and when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshSubscriptions();
    } else {
      // Clear subscriptions when not authenticated
      setSubscriptions([]);
    }
  }, [isAuthenticated]);

  // Refresh all subscriptions from the server
  const refreshSubscriptions = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.getSubscriptions();
      setSubscriptions(response.subscriptions || []);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
      setSubscriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Check if a specific entity is subscribed
  const isSubscribed = useCallback((typeId: string, type: EntityType): boolean => {
    return subscriptions.some(sub => sub.typeId === typeId && sub.type === type);
  }, [subscriptions]);

  // Check subscription status from the server (without updating state)
  const checkSubscriptionStatus = useCallback(async (typeId: string, type: EntityType): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      const response = await apiClient.isSubscribed(typeId, type);
      return response.isSubscribed;
    } catch (err) {
      console.error('Error checking subscription status:', err);
      return false;
    }
  }, [isAuthenticated]);

  // Subscribe to an entity
  const subscribe = useCallback(async (typeId: string, type: EntityType): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('You must be logged in to subscribe');
    }

    try {
      setError(null);
      const response = await apiClient.subscribe(typeId, type);

      // Add to local state immediately for responsive UI
      const newSubscription: Subscription = {
        id: response.subscriptionId,
        typeId,
        type,
        createdAt: new Date().toISOString()
      };

      setSubscriptions(prev => {
        // Check if already exists to avoid duplicates
        const exists = prev.some(sub => sub.typeId === typeId && sub.type === type);
        if (exists) return prev;
        return [...prev, newSubscription];
      });

      // Optionally refresh from server to ensure consistency
      // await refreshSubscriptions();
    } catch (err) {
      console.error('Error subscribing:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
      throw err; // Re-throw so the UI can handle it
    }
  }, [isAuthenticated]);

  // Unsubscribe from an entity
  const unsubscribe = useCallback(async (typeId: string, type: EntityType): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('You must be logged in to unsubscribe');
    }

    try {
      setError(null);
      await apiClient.unsubscribe(typeId, type);

      // Remove from local state immediately for responsive UI
      setSubscriptions(prev =>
        prev.filter(sub => !(sub.typeId === typeId && sub.type === type))
      );

      // Optionally refresh from server to ensure consistency
      // await refreshSubscriptions();
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
      throw err; // Re-throw so the UI can handle it
    }
  }, [isAuthenticated]);

  return {
    subscriptions,
    isLoading,
    error,
    isSubscribed,
    subscribe,
    unsubscribe,
    checkSubscriptionStatus,
    refreshSubscriptions
  };
};