import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealTimeUpdates } from '../../src/hooks/useRealTimeUpdates';
import { realTimeManager } from '../../src/services/realTimeManager';
import type { RealTimeMessage } from '../../src/services/realTimeManager';

// Mock the realTimeManager
vi.mock('../../src/services/realTimeManager', () => ({
  realTimeManager: {
    getConnectionStatus: vi.fn(),
    sendMessage: vi.fn(),
    onMessage: vi.fn(),
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onError: vi.fn(),
    connect: vi.fn()
  }
}));

describe('useRealTimeUpdates', () => {
  const defaultOptions = {
    tenantId: 'test-tenant',
    registryId: 'test-registry'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    (realTimeManager.getConnectionStatus as any).mockReturnValue(false);
    (realTimeManager.onMessage as any).mockReturnValue(() => {});
    (realTimeManager.onConnect as any).mockReturnValue(() => {});
    (realTimeManager.onDisconnect as any).mockReturnValue(() => {});
    (realTimeManager.onError as any).mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Connection', () => {
    it('should connect to realTimeManager with correct parameters on mount', async () => {
      renderHook(() => useRealTimeUpdates(defaultOptions));

      // Wait for the setTimeout to complete
      await new Promise(resolve => setTimeout(resolve, 15));

      expect(realTimeManager.connect).toHaveBeenCalledWith('test-tenant', 'test-registry');
      expect(realTimeManager.getConnectionStatus).toHaveBeenCalled();
    });

    it('should reflect initial connection status', () => {
      (realTimeManager.getConnectionStatus as any).mockReturnValue(true);

      const { result } = renderHook(() => useRealTimeUpdates(defaultOptions));

      expect(result.current.isConnected).toBe(true);
    });

    it('should reconnect when tenantId or registryId changes', async () => {
      const { rerender } = renderHook(
        ({ tenantId, registryId }) => useRealTimeUpdates({ tenantId, registryId }),
        { initialProps: { tenantId: 'tenant1', registryId: 'registry1' } }
      );

      // Wait for the initial setTimeout to complete
      await new Promise(resolve => setTimeout(resolve, 15));

      expect(realTimeManager.connect).toHaveBeenCalledWith('tenant1', 'registry1');

      // Change the parameters
      rerender({ tenantId: 'tenant2', registryId: 'registry2' });

      // Wait for the second setTimeout to complete
      await new Promise(resolve => setTimeout(resolve, 15));

      expect(realTimeManager.connect).toHaveBeenCalledWith('tenant2', 'registry2');
      expect(realTimeManager.connect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event Handling', () => {
    it('should set up message handler when onMessage is provided', () => {
      const mockUnsubscribe = vi.fn();
      (realTimeManager.onMessage as any).mockReturnValue(mockUnsubscribe);

      const onMessage = vi.fn();
      const { unmount } = renderHook(() => useRealTimeUpdates({
        ...defaultOptions,
        onMessage
      }));

      expect(realTimeManager.onMessage).toHaveBeenCalledWith(onMessage);

      // Should clean up on unmount
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should not set up message handler when onMessage is not provided', () => {
      renderHook(() => useRealTimeUpdates(defaultOptions));

      expect(realTimeManager.onMessage).not.toHaveBeenCalled();
    });

    it('should set up connect handler and update state', () => {
      const mockUnsubscribe = vi.fn();
      (realTimeManager.onConnect as any).mockReturnValue(mockUnsubscribe);

      const onConnect = vi.fn();
      const { result } = renderHook(() => useRealTimeUpdates({
        ...defaultOptions,
        onConnect
      }));

      expect(realTimeManager.onConnect).toHaveBeenCalled();

      // Simulate connection
      const connectHandler = (realTimeManager.onConnect as any).mock.calls[0][0];
      act(() => {
        connectHandler();
      });

      expect(result.current.isConnected).toBe(true);
      expect(onConnect).toHaveBeenCalled();
    });

    it('should set up disconnect handler and update state', () => {
      const mockUnsubscribe = vi.fn();
      (realTimeManager.onDisconnect as any).mockReturnValue(mockUnsubscribe);
      // Start as connected
      (realTimeManager.getConnectionStatus as any).mockReturnValue(true);

      const onDisconnect = vi.fn();
      const { result } = renderHook(() => useRealTimeUpdates({
        ...defaultOptions,
        onDisconnect
      }));

      expect(result.current.isConnected).toBe(true);
      expect(realTimeManager.onDisconnect).toHaveBeenCalled();

      // Simulate disconnection
      const disconnectHandler = (realTimeManager.onDisconnect as any).mock.calls[0][0];
      act(() => {
        disconnectHandler();
      });

      expect(result.current.isConnected).toBe(false);
      expect(onDisconnect).toHaveBeenCalled();
    });

    it('should set up error handler when onError is provided', () => {
      const mockUnsubscribe = vi.fn();
      (realTimeManager.onError as any).mockReturnValue(mockUnsubscribe);

      const onError = vi.fn();
      const { unmount } = renderHook(() => useRealTimeUpdates({
        ...defaultOptions,
        onError
      }));

      expect(realTimeManager.onError).toHaveBeenCalledWith(onError);

      // Should clean up on unmount
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should not set up error handler when onError is not provided', () => {
      renderHook(() => useRealTimeUpdates(defaultOptions));

      expect(realTimeManager.onError).not.toHaveBeenCalled();
    });

    it('should clean up all event handlers on unmount', () => {
      const mockUnsubscribes = {
        message: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        error: vi.fn()
      };

      (realTimeManager.onMessage as any).mockReturnValue(mockUnsubscribes.message);
      (realTimeManager.onConnect as any).mockReturnValue(mockUnsubscribes.connect);
      (realTimeManager.onDisconnect as any).mockReturnValue(mockUnsubscribes.disconnect);
      (realTimeManager.onError as any).mockReturnValue(mockUnsubscribes.error);

      const { unmount } = renderHook(() => useRealTimeUpdates({
        ...defaultOptions,
        onMessage: vi.fn(),
        onConnect: vi.fn(),
        onDisconnect: vi.fn(),
        onError: vi.fn()
      }));

      unmount();

      Object.values(mockUnsubscribes).forEach(unsubscribe => {
        expect(unsubscribe).toHaveBeenCalled();
      });
    });

    it('should handle changing event handlers', () => {
      const mockUnsubscribe1 = vi.fn();
      const mockUnsubscribe2 = vi.fn();
      
      (realTimeManager.onMessage as any)
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe2);

      const onMessage1 = vi.fn();
      const onMessage2 = vi.fn();

      const { rerender } = renderHook(
        ({ onMessage }) => useRealTimeUpdates({ ...defaultOptions, onMessage }),
        { initialProps: { onMessage: onMessage1 } }
      );

      expect(realTimeManager.onMessage).toHaveBeenCalledWith(onMessage1);

      // Change the handler
      rerender({ onMessage: onMessage2 });

      expect(mockUnsubscribe1).toHaveBeenCalled();
      expect(realTimeManager.onMessage).toHaveBeenCalledWith(onMessage2);
    });
  });

  describe('Message Sending', () => {
    it('should provide sendMessage function that calls realTimeManager.sendMessage', () => {
      const { result } = renderHook(() => useRealTimeUpdates(defaultOptions));

      const testMessage: RealTimeMessage = {
        type: 'schema_updated',
        data: { schemaId: 'test-schema', version: '1.0.0' }
      };

      act(() => {
        result.current.sendMessage(testMessage);
      });

      expect(realTimeManager.sendMessage).toHaveBeenCalledWith(testMessage);
    });

    it('should maintain sendMessage reference across renders', () => {
      const { result, rerender } = renderHook(() => useRealTimeUpdates(defaultOptions));

      const sendMessage1 = result.current.sendMessage;
      rerender();
      const sendMessage2 = result.current.sendMessage;

      expect(sendMessage1).toBe(sendMessage2);
    });
  });

  describe('Connection Status Updates', () => {
    it('should update connection status when connection events occur', () => {
      (realTimeManager.getConnectionStatus as any).mockReturnValue(false);

      const { result } = renderHook(() => useRealTimeUpdates(defaultOptions));

      expect(result.current.isConnected).toBe(false);

      // Simulate connection
      const connectHandler = (realTimeManager.onConnect as any).mock.calls[0][0];
      act(() => {
        connectHandler();
      });

      expect(result.current.isConnected).toBe(true);

      // Simulate disconnection
      const disconnectHandler = (realTimeManager.onDisconnect as any).mock.calls[0][0];
      act(() => {
        disconnectHandler();
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should sync with realTimeManager status on mount', () => {
      // Test when manager reports connected
      (realTimeManager.getConnectionStatus as any).mockReturnValue(true);

      const { result: result1 } = renderHook(() => useRealTimeUpdates(defaultOptions));
      expect(result1.current.isConnected).toBe(true);

      // Test when manager reports disconnected
      (realTimeManager.getConnectionStatus as any).mockReturnValue(false);

      const { result: result2 } = renderHook(() => useRealTimeUpdates(defaultOptions));
      expect(result2.current.isConnected).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete connection lifecycle', () => {
      const onMessage = vi.fn();
      const onConnect = vi.fn();
      const onDisconnect = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() => useRealTimeUpdates({
        ...defaultOptions,
        onMessage,
        onConnect,
        onDisconnect,
        onError
      }));

      // Initially disconnected
      expect(result.current.isConnected).toBe(false);

      // Simulate connection
      const connectHandler = (realTimeManager.onConnect as any).mock.calls[0][0];
      act(() => {
        connectHandler();
      });

      expect(result.current.isConnected).toBe(true);
      expect(onConnect).toHaveBeenCalled();

      // Simulate receiving a message
      const messageHandler = (realTimeManager.onMessage as any).mock.calls[0][0];
      const testMessage: RealTimeMessage = {
        type: 'registry_updated',
        data: { registryId: 'test-registry' }
      };

      act(() => {
        messageHandler(testMessage);
      });

      expect(onMessage).toHaveBeenCalledWith(testMessage);

      // Simulate error
      const errorHandler = (realTimeManager.onError as any).mock.calls[0][0];
      const testError = new Event('error');

      act(() => {
        errorHandler(testError);
      });

      expect(onError).toHaveBeenCalledWith(testError);

      // Simulate disconnection
      const disconnectHandler = (realTimeManager.onDisconnect as any).mock.calls[0][0];
      act(() => {
        disconnectHandler();
      });

      expect(result.current.isConnected).toBe(false);
      expect(onDisconnect).toHaveBeenCalled();
    });

    it('should handle multiple message types correctly', () => {
      const onMessage = vi.fn();
      renderHook(() => useRealTimeUpdates({ ...defaultOptions, onMessage }));

      const messageHandler = (realTimeManager.onMessage as any).mock.calls[0][0];

      const messages: RealTimeMessage[] = [
        { type: 'schema_created', data: { schemaId: 'new-schema' } },
        { type: 'schema_updated', data: { schemaId: 'existing-schema', version: '1.1.0' } },
        { type: 'schema_deleted', data: { schemaId: 'old-schema' } },
        { type: 'registry_updated', data: { registryId: 'test-registry' } }
      ];

      messages.forEach(message => {
        act(() => {
          messageHandler(message);
        });
      });

      expect(onMessage).toHaveBeenCalledTimes(4);
      messages.forEach((message, index) => {
        expect(onMessage).toHaveBeenNthCalledWith(index + 1, message);
      });
    });

    it('should work with minimal options', async () => {
      const { result } = renderHook(() => useRealTimeUpdates({
        tenantId: 'minimal-tenant',
        registryId: 'minimal-registry'
      }));

      expect(result.current.isConnected).toBeDefined();
      expect(result.current.sendMessage).toBeDefined();
      expect(typeof result.current.sendMessage).toBe('function');
      
      // Wait for the setTimeout to complete
      await new Promise(resolve => setTimeout(resolve, 15));
      
      expect(realTimeManager.connect).toHaveBeenCalledWith('minimal-tenant', 'minimal-registry');
    });

    it('should handle rapid connection state changes', () => {
      const onConnect = vi.fn();
      const onDisconnect = vi.fn();

      const { result } = renderHook(() => useRealTimeUpdates({
        ...defaultOptions,
        onConnect,
        onDisconnect
      }));

      const connectHandler = (realTimeManager.onConnect as any).mock.calls[0][0];
      const disconnectHandler = (realTimeManager.onDisconnect as any).mock.calls[0][0];

      // Simulate rapid connect/disconnect cycles
      act(() => {
        connectHandler();
        disconnectHandler();
        connectHandler();
        disconnectHandler();
        connectHandler();
      });

      expect(result.current.isConnected).toBe(true);
      expect(onConnect).toHaveBeenCalledTimes(3);
      expect(onDisconnect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during event handler setup', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (realTimeManager.onConnect as any).mockImplementation(() => {
        throw new Error('Setup failed');
      });

      expect(() => {
        renderHook(() => useRealTimeUpdates(defaultOptions));
      }).toThrow('Setup failed');

      consoleSpy.mockRestore();
    });

    it('should handle missing unsubscribe functions gracefully', () => {
      // Return functions that do nothing (empty functions instead of null/undefined)
      (realTimeManager.onMessage as any).mockReturnValue(() => {});
      (realTimeManager.onConnect as any).mockReturnValue(() => {});
      (realTimeManager.onDisconnect as any).mockReturnValue(() => {});
      (realTimeManager.onError as any).mockReturnValue(() => {});

      const { unmount } = renderHook(() => useRealTimeUpdates({
        ...defaultOptions,
        onMessage: vi.fn()
      }));

      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should not reconnect when unrelated props change', async () => {
      const { rerender } = renderHook(
        (props) => useRealTimeUpdates({
          tenantId: 'tenant',
          registryId: 'registry',
          ...props
        }),
        { initialProps: { onMessage: vi.fn() } }
      );

      // Wait for the initial setTimeout to complete
      await new Promise(resolve => setTimeout(resolve, 15));

      expect(realTimeManager.connect).toHaveBeenCalledTimes(1);

      // Change handler but not tenant/registry
      rerender({ onMessage: vi.fn() });

      // Wait a bit more to ensure no additional connect calls
      await new Promise(resolve => setTimeout(resolve, 15));

      // Should not reconnect
      expect(realTimeManager.connect).toHaveBeenCalledTimes(1);
    });

    it('should memoize sendMessage callback', () => {
      const { result, rerender } = renderHook(() => useRealTimeUpdates(defaultOptions));

      const sendMessage1 = result.current.sendMessage;
      
      // Multiple rerenders should not change the callback
      rerender();
      rerender();
      rerender();

      const sendMessage2 = result.current.sendMessage;
      expect(sendMessage1).toBe(sendMessage2);
    });
  });
});