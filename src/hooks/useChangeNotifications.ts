import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { realTimeManager, type RealTimeMessage } from '../services/realTimeManager';

export interface ChangesSummary {
  products: { new: number; updated: number; deleted: number };
  domains: { new: number; updated: number; deleted: number };
  contexts: { new: number; updated: number; deleted: number };
  schemas: { new: number; updated: number; deleted: number };
  schema_versions: { new: number; updated: number; deleted: number };
  totalChanges: number;
}

export interface DetailedChange {
  id: string;
  entityType: 'product' | 'domain' | 'context' | 'schema' | 'schema_version';
  entityId: string;
  entityName?: string;
  changeType: 'created' | 'updated' | 'deleted';
  changeData: any;
  changedByUserId?: string;
  createdAt: string;
  changedByUserName?: string;
  changedByUserEmail?: string;
  isBreakingChange?: boolean;
}

export const useChangeNotifications = () => {
  const { authState } = useAuth();
  const [summary, setSummary] = useState<ChangesSummary | null>(null);
  const [detailedChanges, setDetailedChanges] = useState<DetailedChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch changes summary
  const fetchSummary = useCallback(async () => {
    // Only fetch if user is authenticated
    if (!authState.isAuthenticated) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const summaryData = await apiClient.getChangesSummary();
      console.log('Change notifications: API response:', summaryData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error fetching changes summary:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [authState.isAuthenticated]);

  // Fetch detailed changes for specific entity type
  const fetchDetailedChanges = useCallback(async (entityType: string) => {
    // Only fetch if user is authenticated
    if (!authState.isAuthenticated) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const changes = await apiClient.getDetailedChanges(entityType);
      setDetailedChanges(changes);
    } catch (err) {
      console.error('Error fetching detailed changes:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [authState.isAuthenticated]);

  // Fetch all detailed changes (across all entity types)
  const fetchAllDetailedChanges = useCallback(async () => {
    // Only fetch if user is authenticated
    if (!authState.isAuthenticated) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const entityTypes = ['product', 'domain', 'context', 'schema', 'schema_version'];
      const allChanges: DetailedChange[] = [];

      for (const entityType of entityTypes) {
        try {
          const changes = await apiClient.getDetailedChanges(entityType);
          allChanges.push(...changes);
        } catch (entityError) {
          console.warn(`Failed to fetch changes for ${entityType}:`, entityError);
        }
      }

      // Sort by creation date (newest first)
      allChanges.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setDetailedChanges(allChanges);
    } catch (err) {
      console.error('Error fetching all detailed changes:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [authState.isAuthenticated]);

  // Mark changes as seen
  const markChangesAsSeen = useCallback(async (changeIds: string[]) => {
    // Only proceed if user is authenticated
    if (!authState.isAuthenticated) {
      return false;
    }

    try {
      await apiClient.markChangesAsSeen(changeIds);

      // Remove marked changes from detailed changes
      setDetailedChanges(prev => prev.filter(change => !changeIds.includes(change.id)));

      // Refresh summary to update counts
      await fetchSummary();

      return true;
    } catch (err) {
      console.error('Error marking changes as seen:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [authState.isAuthenticated, fetchSummary]);

  // Auto-fetch summary on mount, auth changes, and periodically
  useEffect(() => {
    fetchSummary();

    // Only set up interval if authenticated
    if (authState.isAuthenticated) {
      const interval = setInterval(fetchSummary, 90000);
      return () => clearInterval(interval);
    }
  }, [fetchSummary, authState.isAuthenticated]);

  // Listen for real-time updates to refresh change counts
  useEffect(() => {
    if (!authState.isAuthenticated) {
      return;
    }

    const handleRealTimeUpdate = (message: RealTimeMessage) => {
      // Refresh for data change events AND subscription change events
      const dataChangeTypes = [
        'product_created', 'product_updated', 'product_deleted',
        'domain_created', 'domain_updated', 'domain_deleted',
        'context_created', 'context_updated', 'context_deleted',
        'schema_created', 'schema_updated', 'schema_deleted',
        'schema_version_created', 'schema_version_updated', 'schema_version_deleted'
      ];

      const subscriptionChangeTypes = [
        'user_subscribed', 'user_unsubscribed'
      ];

      if (dataChangeTypes.includes(message.type)) {
        console.log('Change notification: Refreshing change summary due to real-time update:', message.type);
        fetchSummary();
      } else if (subscriptionChangeTypes.includes(message.type)) {
        console.log('Change notification: Refreshing change summary due to subscription change:', message.type, message);
        fetchSummary();
      }
    };

    // Subscribe to real-time updates
    const unsubscribe = realTimeManager.onMessage(handleRealTimeUpdate);

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [authState.isAuthenticated, fetchSummary]);

  return {
    // Data
    summary,
    detailedChanges,
    totalChangeCount: summary?.totalChanges || 0,

    // State
    isLoading,
    error,

    // Actions
    fetchSummary,
    fetchDetailedChanges,
    fetchAllDetailedChanges,
    markChangesAsSeen,

    // Refresh function for manual updates
    refresh: fetchSummary
  };
};