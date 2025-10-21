import { useEffect, useCallback, useState } from 'react';
import { realTimeManager } from '../services/realTimeManager';
import type { RealTimeMessage } from '../services/realTimeManager';

interface UseRealTimeUpdatesOptions {
  tenantId: string;
  registryId: string;
  onMessage?: (message: RealTimeMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export const useRealTimeUpdates = ({
  tenantId,
  registryId,
  onMessage,
  onConnect,
  onDisconnect,
  onError
}: UseRealTimeUpdatesOptions) => {
  const [isConnected, setIsConnected] = useState(realTimeManager.getConnectionStatus());

  const sendMessage = useCallback((message: RealTimeMessage) => {
    realTimeManager.sendMessage(message);
  }, []);

  // Set up event handlers
  useEffect(() => {
    const unsubscribeMessage = onMessage ? realTimeManager.onMessage(onMessage) : () => {};
    
    const unsubscribeConnect = realTimeManager.onConnect(() => {
      setIsConnected(true);
      onConnect?.();
    });
    
    const unsubscribeDisconnect = realTimeManager.onDisconnect(() => {
      setIsConnected(false);
      onDisconnect?.();
    });
    
    const unsubscribeError = onError ? realTimeManager.onError(onError) : () => {};

    return () => {
      unsubscribeMessage();
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeError();
    };
  }, [onMessage, onConnect, onDisconnect, onError]);

  // Connect to the room
  useEffect(() => {
    // Small delay to help with React StrictMode double-mounting
    const timer = setTimeout(() => {
      realTimeManager.connect(tenantId, registryId);
      
      // Update connection status on mount
      setIsConnected(realTimeManager.getConnectionStatus());
    }, 10);

    return () => clearTimeout(timer);
  }, [tenantId, registryId]);

  return {
    isConnected,
    sendMessage
  };
};

export { RealTimeMessage };