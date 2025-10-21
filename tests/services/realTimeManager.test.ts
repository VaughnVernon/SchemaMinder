import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { realTimeManager, RealTimeMessage } from '../../src/services/realTimeManager';

// Mock PartySocket
const mockPartySocket = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn()
}));

const mockPartySocketConstructor = vi.hoisted(() => vi.fn(() => mockPartySocket));

vi.mock('partysocket', () => ({
  default: mockPartySocketConstructor
}));

// Setup window.location for environment-specific tests  
beforeEach(() => {
  Object.defineProperty(window, 'location', {
    value: {
      hostname: 'localhost',
      host: 'localhost:3000'
    },
    writable: true,
  });
});

describe('RealTimeManager', () => {
  beforeEach(() => {
    // Clear all mock calls before each test
    mockPartySocket.addEventListener.mockClear();
    mockPartySocket.send.mockClear();
    mockPartySocket.close.mockClear();
    mockPartySocketConstructor.mockClear();
    
    // Reset connection state
    realTimeManager.disconnect();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    realTimeManager.disconnect();
  });

  describe('Connection Management', () => {
    it('should connect to PartyKit with correct host for localhost', () => {
      window.location.hostname = 'localhost';
      
      realTimeManager.connect('test-tenant', 'test-registry');
      
      expect(mockPartySocketConstructor).toHaveBeenCalledWith({
        host: 'localhost:1999',
        room: 'test-tenant-test-registry'
      });
    });

    it('should connect to PartyKit with production host', () => {
      window.location.hostname = 'example.com';
      window.location.host = 'example.com';
      
      realTimeManager.connect('test-tenant', 'test-registry');
      
      expect(mockPartySocketConstructor).toHaveBeenCalledWith({
        host: 'example.com',
        room: 'test-tenant-test-registry'
      });
    });

    it('should handle 127.0.0.1 as localhost', () => {
      window.location.hostname = '127.0.0.1';
      
      realTimeManager.connect('test-tenant', 'test-registry');
      
      expect(mockPartySocketConstructor).toHaveBeenCalledWith({
        host: 'localhost:1999',
        room: 'test-tenant-test-registry'
      });
    });

    it('should not reconnect if already connected to same room', () => {
      realTimeManager.connect('test-tenant', 'test-registry');
      const firstCallCount = mockPartySocket.addEventListener.mock.calls.length;
      
      // Simulate connection established
      const openHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1];
      openHandler();
      
      realTimeManager.connect('test-tenant', 'test-registry');
      expect(mockPartySocket.addEventListener.mock.calls.length).toBe(firstCallCount);
    });

    it('should disconnect from previous room when connecting to different room', () => {
      realTimeManager.connect('tenant1', 'registry1');
      expect(mockPartySocket.close).not.toHaveBeenCalled();
      
      realTimeManager.connect('tenant2', 'registry2');
      expect(mockPartySocket.close).toHaveBeenCalled();
    });

    it('should properly disconnect and clean up', () => {
      realTimeManager.connect('test-tenant', 'test-registry');
      
      realTimeManager.disconnect();
      
      expect(mockPartySocket.close).toHaveBeenCalled();
      expect(realTimeManager.getConnectionStatus()).toBe(false);
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      realTimeManager.connect('test-tenant', 'test-registry');
    });

    it('should handle connection open event', () => {
      const connectHandler = vi.fn();
      realTimeManager.onConnect(connectHandler);
      
      const openHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1];
      openHandler();
      
      expect(connectHandler).toHaveBeenCalled();
      expect(realTimeManager.getConnectionStatus()).toBe(true);
    });

    it('should handle connection close event and schedule reconnect', () => {
      const disconnectHandler = vi.fn();
      realTimeManager.onDisconnect(disconnectHandler);
      
      // First establish connection
      const openHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1];
      openHandler();
      
      // Then trigger close
      const closeHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )[1];
      closeHandler();
      
      expect(disconnectHandler).toHaveBeenCalled();
      expect(realTimeManager.getConnectionStatus()).toBe(false);
    });

    it('should handle error events', () => {
      const errorHandler = vi.fn();
      realTimeManager.onError(errorHandler);
      
      const errorEvent = new Event('error');
      const socketErrorHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      socketErrorHandler(errorEvent);
      
      expect(errorHandler).toHaveBeenCalledWith(errorEvent);
      expect(realTimeManager.getConnectionStatus()).toBe(false);
    });

    it('should parse and handle valid message events', () => {
      const messageHandler = vi.fn();
      realTimeManager.onMessage(messageHandler);
      
      const testMessage: RealTimeMessage = {
        type: 'schema_created',
        entityId: 'schema-1',
        entityType: 'schema',
        data: { name: 'Test Schema' },
        timestamp: '2023-01-01T00:00:00Z'
      };
      
      const messageEvent = {
        data: JSON.stringify(testMessage)
      };
      
      const socketMessageHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      socketMessageHandler(messageEvent);
      
      expect(messageHandler).toHaveBeenCalledWith(testMessage);
    });

    it('should handle invalid JSON in message events', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const messageHandler = vi.fn();
      realTimeManager.onMessage(messageHandler);
      
      const messageEvent = {
        data: 'invalid json'
      };
      
      const socketMessageHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      socketMessageHandler(messageEvent);
      
      expect(messageHandler).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse message'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Message Sending', () => {
    it('should send message when connected', () => {
      realTimeManager.connect('test-tenant', 'test-registry');
      
      // Simulate connection established
      const openHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1];
      openHandler();
      
      const testMessage: RealTimeMessage = {
        type: 'schema_updated',
        entityId: 'schema-1',
        data: { name: 'Updated Schema' }
      };
      
      realTimeManager.sendMessage(testMessage);
      
      expect(mockPartySocket.send).toHaveBeenCalledWith(JSON.stringify(testMessage));
    });

    it('should not send message when not connected', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const testMessage: RealTimeMessage = {
        type: 'schema_created',
        entityId: 'schema-1'
      };
      
      realTimeManager.sendMessage(testMessage);
      
      expect(mockPartySocket.send).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot send message - not connected')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Event Handler Management', () => {
    it('should add and remove message handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      const unsubscribe1 = realTimeManager.onMessage(handler1);
      const unsubscribe2 = realTimeManager.onMessage(handler2);
      
      realTimeManager.connect('test-tenant', 'test-registry');
      
      const testMessage: RealTimeMessage = { type: 'connected' };
      const messageEvent = { data: JSON.stringify(testMessage) };
      
      const socketMessageHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      socketMessageHandler(messageEvent);
      
      expect(handler1).toHaveBeenCalledWith(testMessage);
      expect(handler2).toHaveBeenCalledWith(testMessage);
      
      // Remove first handler
      unsubscribe1();
      handler1.mockClear();
      handler2.mockClear();
      
      socketMessageHandler(messageEvent);
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith(testMessage);
      
      // Remove second handler
      unsubscribe2();
      handler2.mockClear();
      
      socketMessageHandler(messageEvent);
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should add and remove connect handlers', () => {
      const handler = vi.fn();
      const unsubscribe = realTimeManager.onConnect(handler);
      
      realTimeManager.connect('test-tenant', 'test-registry');
      
      const openHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1];
      openHandler();
      
      expect(handler).toHaveBeenCalled();
      
      // Remove handler and test it doesn't get called again
      unsubscribe();
      handler.mockClear();
      openHandler();
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should add and remove disconnect handlers', () => {
      const handler = vi.fn();
      const unsubscribe = realTimeManager.onDisconnect(handler);
      
      realTimeManager.connect('test-tenant', 'test-registry');
      
      const closeHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )[1];
      closeHandler();
      
      expect(handler).toHaveBeenCalled();
      
      // Remove handler and test it doesn't get called again
      unsubscribe();
      handler.mockClear();
      closeHandler();
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should add and remove error handlers', () => {
      const handler = vi.fn();
      const unsubscribe = realTimeManager.onError(handler);
      
      realTimeManager.connect('test-tenant', 'test-registry');
      
      const errorEvent = new Event('error');
      const errorHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      errorHandler(errorEvent);
      
      expect(handler).toHaveBeenCalledWith(errorEvent);
      
      // Remove handler and test it doesn't get called again
      unsubscribe();
      handler.mockClear();
      errorHandler(errorEvent);
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Connection Status', () => {
    it('should return false when not connected', () => {
      expect(realTimeManager.getConnectionStatus()).toBe(false);
    });

    it('should return true when connected', () => {
      realTimeManager.connect('test-tenant', 'test-registry');
      
      const openHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1];
      openHandler();
      
      expect(realTimeManager.getConnectionStatus()).toBe(true);
    });

    it('should return false after disconnection', () => {
      realTimeManager.connect('test-tenant', 'test-registry');
      
      // Connect
      const openHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1];
      openHandler();
      expect(realTimeManager.getConnectionStatus()).toBe(true);
      
      // Disconnect
      realTimeManager.disconnect();
      expect(realTimeManager.getConnectionStatus()).toBe(false);
    });
  });

  describe('Message Types', () => {
    it('should handle all supported message types', () => {
      const messageHandler = vi.fn();
      realTimeManager.onMessage(messageHandler);
      realTimeManager.connect('test-tenant', 'test-registry');
      
      const messageTypes: RealTimeMessage['type'][] = [
        'schema_created', 'schema_updated', 'schema_deleted',
        'schema_version_created', 'schema_version_updated', 'schema_version_deleted',
        'product_created', 'product_updated', 'product_deleted',
        'domain_created', 'domain_updated', 'domain_deleted',
        'context_created', 'context_updated', 'context_deleted',
        'connected', 'error'
      ];
      
      const socketMessageHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      
      messageTypes.forEach(type => {
        const testMessage: RealTimeMessage = { type };
        const messageEvent = { data: JSON.stringify(testMessage) };
        
        messageHandler.mockClear();
        socketMessageHandler(messageEvent);
        
        expect(messageHandler).toHaveBeenCalledWith(
          expect.objectContaining({ type })
        );
      });
    });

    it('should handle messages with all optional fields', () => {
      const messageHandler = vi.fn();
      realTimeManager.onMessage(messageHandler);
      realTimeManager.connect('test-tenant', 'test-registry');
      
      const completeMessage: RealTimeMessage = {
        type: 'schema_updated',
        entityId: 'schema-123',
        entityType: 'schema',
        data: { name: 'Updated Schema', version: '2.0.0' },
        timestamp: '2023-01-01T12:00:00Z',
        userId: 'user-456',
        senderId: 'sender-789',
        connectionId: 'conn-abc',
        message: 'Schema updated successfully'
      };
      
      const messageEvent = { data: JSON.stringify(completeMessage) };
      const socketMessageHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      socketMessageHandler(messageEvent);
      
      expect(messageHandler).toHaveBeenCalledWith(completeMessage);
    });
  });

  describe('Business Logic Methods', () => {
    beforeEach(() => {
      realTimeManager.connect('test-tenant', 'test-registry');
      // Simulate connection established
      const openHandler = mockPartySocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )[1];
      openHandler();
      mockPartySocket.send.mockClear();
    });

    describe('Product Notification Methods', () => {
      it('should notify product creation with correct message structure', () => {
        const productId = 'product-123';
        const productData = { name: 'Test Product', description: 'A test product' };
        const userId = 'user-456';

        realTimeManager.notifyProductCreated(productId, productData, userId);

        expect(mockPartySocket.send).toHaveBeenCalledTimes(1);
        const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
        
        expect(sentMessage).toEqual({
          type: 'product_created',
          entityId: productId,
          entityType: 'product',
          data: productData,
          timestamp: expect.any(String),
          userId
        });
        
        // Verify timestamp is a valid ISO string
        expect(new Date(sentMessage.timestamp).toISOString()).toBe(sentMessage.timestamp);
      });

      it('should notify product creation with default userId', () => {
        const productId = 'product-123';
        const productData = { name: 'Test Product' };

        realTimeManager.notifyProductCreated(productId, productData);

        const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
        expect(sentMessage.userId).toBe('current-user');
      });

      it('should notify product update with correct message structure', () => {
        const productId = 'product-123';
        const updates = { name: 'Updated Product', description: 'Updated description' };
        const userId = 'user-456';

        realTimeManager.notifyProductUpdated(productId, updates, userId);

        expect(mockPartySocket.send).toHaveBeenCalledTimes(1);
        const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
        
        expect(sentMessage).toEqual({
          type: 'product_updated',
          entityId: productId,
          entityType: 'product',
          data: updates,
          timestamp: expect.any(String),
          userId
        });
      });
    });

    describe('Domain Notification Methods', () => {
      it('should notify domain creation with correct message structure', () => {
        const domainId = 'domain-123';
        const domainData = { name: 'Test Domain', description: 'A test domain' };
        const userId = 'user-456';

        realTimeManager.notifyDomainCreated(domainId, domainData, userId);

        expect(mockPartySocket.send).toHaveBeenCalledTimes(1);
        const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
        
        expect(sentMessage).toEqual({
          type: 'domain_created',
          entityId: domainId,
          entityType: 'domain',
          data: domainData,
          timestamp: expect.any(String),
          userId
        });
      });

      it('should notify domain update with correct message structure', () => {
        const domainId = 'domain-123';
        const updates = { name: 'Updated Domain' };
        const userId = 'user-456';

        realTimeManager.notifyDomainUpdated(domainId, updates, userId);

        expect(mockPartySocket.send).toHaveBeenCalledTimes(1);
        const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
        
        expect(sentMessage).toEqual({
          type: 'domain_updated',
          entityId: domainId,
          entityType: 'domain',
          data: updates,
          timestamp: expect.any(String),
          userId
        });
      });
    });

    describe('Context Notification Methods', () => {
      it('should notify context creation with correct message structure', () => {
        const contextId = 'context-123';
        const contextData = { name: 'Test Context', description: 'A test context' };
        const userId = 'user-456';

        realTimeManager.notifyContextCreated(contextId, contextData, userId);

        expect(mockPartySocket.send).toHaveBeenCalledTimes(1);
        const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
        
        expect(sentMessage).toEqual({
          type: 'context_created',
          entityId: contextId,
          entityType: 'context',
          data: contextData,
          timestamp: expect.any(String),
          userId
        });
      });

      it('should notify context update with correct message structure', () => {
        const contextId = 'context-123';
        const updates = { name: 'Updated Context' };
        const userId = 'user-456';

        realTimeManager.notifyContextUpdated(contextId, updates, userId);

        expect(mockPartySocket.send).toHaveBeenCalledTimes(1);
        const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
        
        expect(sentMessage).toEqual({
          type: 'context_updated',
          entityId: contextId,
          entityType: 'context',
          data: updates,
          timestamp: expect.any(String),
          userId
        });
      });
    });

    describe('Schema Notification Methods', () => {
      it('should notify schema creation with correct message structure', () => {
        const schemaId = 'schema-123';
        const schemaData = { 
          name: 'Test Schema', 
          description: 'A test schema',
          schemaTypeCategory: 'Events'
        };
        const userId = 'user-456';

        realTimeManager.notifySchemaCreated(schemaId, schemaData, userId);

        expect(mockPartySocket.send).toHaveBeenCalledTimes(1);
        const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
        
        expect(sentMessage).toEqual({
          type: 'schema_created',
          entityId: schemaId,
          entityType: 'schema',
          data: schemaData,
          timestamp: expect.any(String),
          userId
        });
      });

      it('should notify schema update with correct message structure', () => {
        const schemaId = 'schema-123';
        const updates = { 
          name: 'Updated Schema',
          hasVersionUpdates: true
        };
        const userId = 'user-456';

        realTimeManager.notifySchemaUpdated(schemaId, updates, userId);

        expect(mockPartySocket.send).toHaveBeenCalledTimes(1);
        const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
        
        expect(sentMessage).toEqual({
          type: 'schema_updated',
          entityId: schemaId,
          entityType: 'schema',
          data: updates,
          timestamp: expect.any(String),
          userId
        });
      });
    });

    describe('Version Notification Methods', () => {
      it('should notify version creation with correct message structure', () => {
        const schemaId = 'schema-123';
        const versionData = { 
          schemaId: 'schema-123',
          semanticVersion: '1.0.0',
          description: 'Initial version',
          status: 'Draft'
        };
        const userId = 'user-456';

        realTimeManager.notifyVersionCreated(schemaId, versionData, userId);

        expect(mockPartySocket.send).toHaveBeenCalledTimes(1);
        const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
        
        expect(sentMessage).toEqual({
          type: 'schema_version_created',
          entityId: schemaId,
          entityType: 'schema_version',
          data: versionData,
          timestamp: expect.any(String),
          userId
        });
      });

      it('should notify version update with correct message structure', () => {
        const versionId = 'version-123';
        const updates = { 
          schemaId: 'schema-123',
          versionId: 'version-123',
          description: 'Updated version',
          status: 'Published'
        };
        const userId = 'user-456';

        realTimeManager.notifyVersionUpdated(versionId, updates, userId);

        expect(mockPartySocket.send).toHaveBeenCalledTimes(1);
        const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
        
        expect(sentMessage).toEqual({
          type: 'schema_version_updated',
          entityId: versionId,
          entityType: 'schema_version',
          data: updates,
          timestamp: expect.any(String),
          userId
        });
      });
    });

    describe('Error Handling for Business Methods', () => {
      it('should handle sending messages when not connected', () => {
        realTimeManager.disconnect();

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        realTimeManager.notifyProductCreated('product-123', { name: 'Test' });

        expect(mockPartySocket.send).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('RealTimeManager: Cannot send message - not connected');

        consoleSpy.mockRestore();
      });

      it('should handle null data gracefully', () => {
        realTimeManager.notifyProductCreated('product-123', null);

        expect(mockPartySocket.send).toHaveBeenCalledTimes(1);
        const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
        expect(sentMessage.data).toBeNull();
      });

      it('should handle undefined data gracefully', () => {
        realTimeManager.notifySchemaUpdated('schema-123', undefined);

        expect(mockPartySocket.send).toHaveBeenCalledTimes(1);
        const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
        expect(sentMessage.data).toBeUndefined();
      });
    });

    describe('Timestamp Generation', () => {
      it('should generate unique timestamps for multiple calls', async () => {
        realTimeManager.notifyProductCreated('product-1', { name: 'Product 1' });
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 2));
        
        realTimeManager.notifyProductCreated('product-2', { name: 'Product 2' });

        expect(mockPartySocket.send).toHaveBeenCalledTimes(2);
        
        const message1 = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
        const message2 = JSON.parse(mockPartySocket.send.mock.calls[1][0]);
        
        expect(message1.timestamp).not.toBe(message2.timestamp);
        expect(new Date(message1.timestamp).getTime()).toBeLessThanOrEqual(new Date(message2.timestamp).getTime());
      });

      it('should generate valid ISO timestamps', () => {
        realTimeManager.notifyDomainCreated('domain-123', { name: 'Test Domain' });

        const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
        const timestamp = sentMessage.timestamp;
        
        // Should be a valid ISO string
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        
        // Should be parseable and equal to itself
        const parsedDate = new Date(timestamp);
        expect(parsedDate.toISOString()).toBe(timestamp);
        
        // Should be recent (within last second)
        const now = new Date();
        const timeDiff = now.getTime() - parsedDate.getTime();
        expect(timeDiff).toBeLessThan(1000);
      });
    });

    describe('Message Structure Validation', () => {
      it('should use correct message types for all notification methods', () => {
        const testCases = [
          { method: 'notifyProductCreated', expectedType: 'product_created', args: ['id', {}] },
          { method: 'notifyProductUpdated', expectedType: 'product_updated', args: ['id', {}] },
          { method: 'notifyDomainCreated', expectedType: 'domain_created', args: ['id', {}] },
          { method: 'notifyDomainUpdated', expectedType: 'domain_updated', args: ['id', {}] },
          { method: 'notifyContextCreated', expectedType: 'context_created', args: ['id', {}] },
          { method: 'notifyContextUpdated', expectedType: 'context_updated', args: ['id', {}] },
          { method: 'notifySchemaCreated', expectedType: 'schema_created', args: ['id', {}] },
          { method: 'notifySchemaUpdated', expectedType: 'schema_updated', args: ['id', {}] },
          { method: 'notifyVersionCreated', expectedType: 'schema_version_created', args: ['id', {}] },
          { method: 'notifyVersionUpdated', expectedType: 'schema_version_updated', args: ['id', {}] }
        ];

        testCases.forEach(({ method, expectedType, args }) => {
          mockPartySocket.send.mockClear();
          (realTimeManager as any)[method](...args);
          
          expect(mockPartySocket.send).toHaveBeenCalledTimes(1);
          const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
          expect(sentMessage.type).toBe(expectedType);
        });
      });

      it('should use correct entity types for all notification methods', () => {
        const testCases = [
          { method: 'notifyProductCreated', expectedEntityType: 'product', args: ['id', {}] },
          { method: 'notifyProductUpdated', expectedEntityType: 'product', args: ['id', {}] },
          { method: 'notifyDomainCreated', expectedEntityType: 'domain', args: ['id', {}] },
          { method: 'notifyDomainUpdated', expectedEntityType: 'domain', args: ['id', {}] },
          { method: 'notifyContextCreated', expectedEntityType: 'context', args: ['id', {}] },
          { method: 'notifyContextUpdated', expectedEntityType: 'context', args: ['id', {}] },
          { method: 'notifySchemaCreated', expectedEntityType: 'schema', args: ['id', {}] },
          { method: 'notifySchemaUpdated', expectedEntityType: 'schema', args: ['id', {}] },
          { method: 'notifyVersionCreated', expectedEntityType: 'schema_version', args: ['id', {}] },
          { method: 'notifyVersionUpdated', expectedEntityType: 'schema_version', args: ['id', {}] }
        ];

        testCases.forEach(({ method, expectedEntityType, args }) => {
          mockPartySocket.send.mockClear();
          (realTimeManager as any)[method](...args);
          
          expect(mockPartySocket.send).toHaveBeenCalledTimes(1);
          const sentMessage = JSON.parse(mockPartySocket.send.mock.calls[0][0]);
          expect(sentMessage.entityType).toBe(expectedEntityType);
        });
      });
    });
  });

  describe('Message Analysis Methods', () => {
    describe('hasData', () => {
      it('should return true when message has data', () => {
        const message: RealTimeMessage = { type: 'schema_created', data: { name: 'Test' } };
        expect(realTimeManager.hasData(message)).toBe(true);
      });

      it('should return false when message has no data', () => {
        const message: RealTimeMessage = { type: 'connected' };
        expect(realTimeManager.hasData(message)).toBe(false);
      });

      it('should return false when data is null', () => {
        const message: RealTimeMessage = { type: 'schema_created', data: null };
        expect(realTimeManager.hasData(message)).toBe(false);
      });

      it('should return false when data is undefined', () => {
        const message: RealTimeMessage = { type: 'schema_created', data: undefined };
        expect(realTimeManager.hasData(message)).toBe(false);
      });
    });

    describe('hasSender', () => {
      it('should return true when message has senderId', () => {
        const message: RealTimeMessage = { type: 'schema_created', senderId: 'user-123' };
        expect(realTimeManager.hasSender(message)).toBe(true);
      });

      it('should return false when message has no senderId', () => {
        const message: RealTimeMessage = { type: 'connected' };
        expect(realTimeManager.hasSender(message)).toBe(false);
      });

      it('should return false when senderId is null', () => {
        const message: RealTimeMessage = { type: 'schema_created', senderId: null };
        expect(realTimeManager.hasSender(message)).toBe(false);
      });

      it('should return false when senderId is empty string', () => {
        const message: RealTimeMessage = { type: 'schema_created', senderId: '' };
        expect(realTimeManager.hasSender(message)).toBe(false);
      });
    });

    describe('isConnectionConfirmation', () => {
      it('should return true for connected message', () => {
        const message: RealTimeMessage = { type: 'connected' };
        expect(realTimeManager.isConnectionConfirmation(message)).toBe(true);
      });

      it('should return false for non-connected messages', () => {
        const messages: RealTimeMessage[] = [
          { type: 'error' },
          { type: 'schema_created' },
          { type: 'schema_version_updated' }
        ];
        
        messages.forEach(message => {
          expect(realTimeManager.isConnectionConfirmation(message)).toBe(false);
        });
      });
    });

    describe('isError', () => {
      it('should return true for error message', () => {
        const message: RealTimeMessage = { type: 'error' };
        expect(realTimeManager.isError(message)).toBe(true);
      });

      it('should return false for non-error messages', () => {
        const messages: RealTimeMessage[] = [
          { type: 'connected' },
          { type: 'schema_created' },
          { type: 'schema_version_updated' }
        ];
        
        messages.forEach(message => {
          expect(realTimeManager.isError(message)).toBe(false);
        });
      });
    });

    describe('isActionable', () => {
      it('should return true for actionable messages', () => {
        const message: RealTimeMessage = { 
          type: 'schema_created', 
          senderId: 'user-123' 
        };
        expect(realTimeManager.isActionable(message)).toBe(true);
      });

      it('should return false for messages without sender', () => {
        const message: RealTimeMessage = { type: 'schema_created' };
        expect(realTimeManager.isActionable(message)).toBe(false);
      });

      it('should return false for connection confirmation messages', () => {
        const message: RealTimeMessage = { 
          type: 'connected', 
          senderId: 'user-123' 
        };
        expect(realTimeManager.isActionable(message)).toBe(false);
      });

      it('should return false for error messages', () => {
        const message: RealTimeMessage = { 
          type: 'error', 
          senderId: 'user-123' 
        };
        expect(realTimeManager.isActionable(message)).toBe(false);
      });
    });

    describe('isVersionUpdate', () => {
      it('should return true for schema_version_created messages', () => {
        const message: RealTimeMessage = { type: 'schema_version_created' };
        expect(realTimeManager.isVersionUpdate(message)).toBe(true);
      });

      it('should return true for schema_version_updated messages', () => {
        const message: RealTimeMessage = { type: 'schema_version_updated' };
        expect(realTimeManager.isVersionUpdate(message)).toBe(true);
      });

      it('should return false for non-version update messages', () => {
        const messages: RealTimeMessage[] = [
          { type: 'schema_created' },
          { type: 'schema_updated' },
          { type: 'connected' },
          { type: 'error' }
        ];
        
        messages.forEach(message => {
          expect(realTimeManager.isVersionUpdate(message)).toBe(false);
        });
      });
    });

    describe('isSameSemanticVersion', () => {
      it('should return true when semantic versions match', () => {
        const message: RealTimeMessage = { 
          type: 'version_updated',
          data: { semanticVersion: '1.0.0' }
        };
        expect(realTimeManager.isSameSemanticVersion(message, '1.0.0')).toBe(true);
      });

      it('should return false when semantic versions do not match', () => {
        const message: RealTimeMessage = { 
          type: 'version_updated',
          data: { semanticVersion: '1.0.0' }
        };
        expect(realTimeManager.isSameSemanticVersion(message, '2.0.0')).toBe(false);
      });

      it('should return false when message has no data', () => {
        const message: RealTimeMessage = { type: 'version_updated' };
        expect(realTimeManager.isSameSemanticVersion(message, '1.0.0')).toBe(false);
      });

      it('should return false when data has no semanticVersion', () => {
        const message: RealTimeMessage = { 
          type: 'version_updated',
          data: { name: 'Test' }
        };
        expect(realTimeManager.isSameSemanticVersion(message, '1.0.0')).toBe(false);
      });
    });

    describe('isSameSchema', () => {
      it('should return true when schema IDs match', () => {
        const message: RealTimeMessage = { 
          type: 'schema_updated',
          data: { schemaId: 'schema-123' }
        };
        expect(realTimeManager.isSameSchema(message, 'schema-123')).toBe(true);
      });

      it('should return false when schema IDs do not match', () => {
        const message: RealTimeMessage = { 
          type: 'schema_updated',
          data: { schemaId: 'schema-123' }
        };
        expect(realTimeManager.isSameSchema(message, 'schema-456')).toBe(false);
      });

      it('should return false when message has no data', () => {
        const message: RealTimeMessage = { type: 'schema_updated' };
        expect(realTimeManager.isSameSchema(message, 'schema-123')).toBe(false);
      });

      it('should return false when data has no schemaId', () => {
        const message: RealTimeMessage = { 
          type: 'schema_updated',
          data: { name: 'Test' }
        };
        expect(realTimeManager.isSameSchema(message, 'schema-123')).toBe(false);
      });
    });

    describe('isSameVersion', () => {
      it('should return true when version IDs match', () => {
        const message: RealTimeMessage = { 
          type: 'version_updated',
          data: { versionId: 'version-123' }
        };
        expect(realTimeManager.isSameVersion(message, 'version-123')).toBe(true);
      });

      it('should return false when version IDs do not match', () => {
        const message: RealTimeMessage = { 
          type: 'version_updated',
          data: { versionId: 'version-123' }
        };
        expect(realTimeManager.isSameVersion(message, 'version-456')).toBe(false);
      });

      it('should return false when message has no data', () => {
        const message: RealTimeMessage = { type: 'version_updated' };
        expect(realTimeManager.isSameVersion(message, 'version-123')).toBe(false);
      });

      it('should return false when data has no versionId', () => {
        const message: RealTimeMessage = { 
          type: 'version_updated',
          data: { name: 'Test' }
        };
        expect(realTimeManager.isSameVersion(message, 'version-123')).toBe(false);
      });
    });

    describe('Integration Tests for Message Analysis', () => {
      it('should correctly identify actionable schema update from external user', () => {
        const message: RealTimeMessage = {
          type: 'schema_updated',
          senderId: 'other-user-123',
          data: { schemaId: 'schema-456', name: 'Updated Schema' }
        };

        expect(realTimeManager.isActionable(message)).toBe(true);
        expect(realTimeManager.isVersionUpdate(message)).toBe(false);
        expect(realTimeManager.hasData(message)).toBe(true);
        expect(realTimeManager.isSameSchema(message, 'schema-456')).toBe(true);
      });

      it('should correctly identify non-actionable connection message', () => {
        const message: RealTimeMessage = {
          type: 'connected',
          senderId: 'user-123'
        };

        expect(realTimeManager.isActionable(message)).toBe(false);
        expect(realTimeManager.isConnectionConfirmation(message)).toBe(true);
        expect(realTimeManager.isError(message)).toBe(false);
      });

      it('should correctly identify version update affecting current schema', () => {
        const message: RealTimeMessage = {
          type: 'schema_version_created',
          senderId: 'other-user-123',
          data: { 
            schemaId: 'schema-123', 
            versionId: 'version-456',
            semanticVersion: '2.0.0'
          }
        };

        expect(realTimeManager.isActionable(message)).toBe(true);
        expect(realTimeManager.isVersionUpdate(message)).toBe(true);
        expect(realTimeManager.isSameSchema(message, 'schema-123')).toBe(true);
        expect(realTimeManager.isSameVersion(message, 'version-456')).toBe(true);
        expect(realTimeManager.isSameSemanticVersion(message, '2.0.0')).toBe(true);
      });
    });

    describe('Server-Side Notification Support', () => {
      describe('hasSender with source field', () => {
        it('should return true for messages with source=server', () => {
          const message: RealTimeMessage = {
            type: 'schema_created',
            source: 'server',
            entityId: 'schema-123'
          };
          expect(realTimeManager.hasSender(message)).toBe(true);
        });

        it('should return true for messages with source=durable-object', () => {
          const message: RealTimeMessage = {
            type: 'version_updated',
            source: 'durable-object',
            entityId: 'version-123'
          };
          expect(realTimeManager.hasSender(message)).toBe(true);
        });

        it('should return false for messages with source=client', () => {
          const message: RealTimeMessage = {
            type: 'product_created',
            source: 'client',
            entityId: 'product-123'
          };
          expect(realTimeManager.hasSender(message)).toBe(false);
        });

        it('should return true for messages with senderId (backward compatibility)', () => {
          const message: RealTimeMessage = {
            type: 'domain_updated',
            senderId: 'connection-123',
            entityId: 'domain-123'
          };
          expect(realTimeManager.hasSender(message)).toBe(true);
        });

        it('should return false for messages without source or senderId', () => {
          const message: RealTimeMessage = {
            type: 'context_deleted',
            entityId: 'context-123'
          };
          expect(realTimeManager.hasSender(message)).toBe(false);
        });
      });

      describe('isActionable with server messages', () => {
        it('should process server-originated product operations', () => {
          const createMessage: RealTimeMessage = {
            type: 'product_created',
            source: 'server',
            entityId: 'product-123',
            entityType: 'product',
            data: { name: 'New Product' }
          };
          expect(realTimeManager.isActionable(createMessage)).toBe(true);

          const updateMessage: RealTimeMessage = {
            type: 'product_updated',
            source: 'durable-object',
            entityId: 'product-123',
            entityType: 'product',
            data: { name: 'Updated Product' }
          };
          expect(realTimeManager.isActionable(updateMessage)).toBe(true);

          const deleteMessage: RealTimeMessage = {
            type: 'product_deleted',
            source: 'server',
            entityId: 'product-123',
            entityType: 'product'
          };
          expect(realTimeManager.isActionable(deleteMessage)).toBe(true);
        });

        it('should process server-originated domain operations', () => {
          const createMessage: RealTimeMessage = {
            type: 'domain_created',
            source: 'durable-object',
            entityId: 'domain-123',
            entityType: 'domain',
            data: { name: 'New Domain', productId: 'product-123' }
          };
          expect(realTimeManager.isActionable(createMessage)).toBe(true);

          const updateMessage: RealTimeMessage = {
            type: 'domain_updated',
            source: 'server',
            entityId: 'domain-123',
            entityType: 'domain',
            data: { name: 'Updated Domain' }
          };
          expect(realTimeManager.isActionable(updateMessage)).toBe(true);

          const deleteMessage: RealTimeMessage = {
            type: 'domain_deleted',
            source: 'durable-object',
            entityId: 'domain-123',
            entityType: 'domain'
          };
          expect(realTimeManager.isActionable(deleteMessage)).toBe(true);
        });

        it('should process server-originated context operations', () => {
          const createMessage: RealTimeMessage = {
            type: 'context_created',
            source: 'server',
            entityId: 'context-123',
            entityType: 'context',
            data: { name: 'New Context', domainId: 'domain-123' }
          };
          expect(realTimeManager.isActionable(createMessage)).toBe(true);

          const updateMessage: RealTimeMessage = {
            type: 'context_updated',
            source: 'durable-object',
            entityId: 'context-123',
            entityType: 'context',
            data: { name: 'Updated Context' }
          };
          expect(realTimeManager.isActionable(updateMessage)).toBe(true);

          const deleteMessage: RealTimeMessage = {
            type: 'context_deleted',
            source: 'server',
            entityId: 'context-123',
            entityType: 'context'
          };
          expect(realTimeManager.isActionable(deleteMessage)).toBe(true);
        });

        it('should process server-originated schema operations', () => {
          const createMessage: RealTimeMessage = {
            type: 'schema_created',
            source: 'durable-object',
            entityId: 'schema-123',
            entityType: 'schema',
            data: { 
              name: 'New Schema',
              schemaTypeCategory: 'Commands',
              scope: 'Public',
              contextId: 'context-123'
            }
          };
          expect(realTimeManager.isActionable(createMessage)).toBe(true);

          const updateMessage: RealTimeMessage = {
            type: 'schema_updated',
            source: 'server',
            entityId: 'schema-123',
            entityType: 'schema',
            data: { 
              name: 'Updated Schema',
              schemaTypeCategory: 'Events',
              scope: 'Private'
            }
          };
          expect(realTimeManager.isActionable(updateMessage)).toBe(true);

          const deleteMessage: RealTimeMessage = {
            type: 'schema_deleted',
            source: 'durable-object',
            entityId: 'schema-123',
            entityType: 'schema'
          };
          expect(realTimeManager.isActionable(deleteMessage)).toBe(true);
        });

        it('should process server-originated version operations', () => {
          const createMessage: RealTimeMessage = {
            type: 'schema_version_created',
            source: 'server',
            entityId: 'version-123',
            entityType: 'schema_version',
            data: { 
              semanticVersion: '1.0.0',
              status: 'Draft',
              schemaId: 'schema-123'
            }
          };
          expect(realTimeManager.isActionable(createMessage)).toBe(true);
          expect(realTimeManager.isVersionUpdate(createMessage)).toBe(true);

          const updateMessage: RealTimeMessage = {
            type: 'schema_version_updated',
            source: 'durable-object',
            entityId: 'version-123',
            entityType: 'schema_version',
            data: { 
              semanticVersion: '1.0.0',
              status: 'Published',
              schemaId: 'schema-123'
            }
          };
          expect(realTimeManager.isActionable(updateMessage)).toBe(true);
          expect(realTimeManager.isVersionUpdate(updateMessage)).toBe(true);

          const deleteMessage: RealTimeMessage = {
            type: 'version_deleted',
            source: 'server',
            entityId: 'version-123',
            entityType: 'version'
          };
          expect(realTimeManager.isActionable(deleteMessage)).toBe(true);
          expect(realTimeManager.isVersionUpdate(deleteMessage)).toBe(false);
        });

        it('should not process connection messages from server', () => {
          const message: RealTimeMessage = {
            type: 'connected',
            source: 'server',
            connectionId: 'conn-123'
          };
          expect(realTimeManager.isActionable(message)).toBe(false);
          expect(realTimeManager.isConnectionConfirmation(message)).toBe(true);
        });

        it('should not process error messages from server', () => {
          const message: RealTimeMessage = {
            type: 'error',
            source: 'server',
            message: 'Something went wrong'
          };
          expect(realTimeManager.isActionable(message)).toBe(false);
          expect(realTimeManager.isError(message)).toBe(true);
        });
      });

      describe('Mixed source scenarios', () => {
        it('should handle messages from different sources correctly', () => {
          const serverMsg: RealTimeMessage = {
            type: 'product_created',
            source: 'server',
            entityId: 'p1'
          };
          const durableMsg: RealTimeMessage = {
            type: 'product_created',
            source: 'durable-object',
            entityId: 'p2'
          };
          const clientMsg: RealTimeMessage = {
            type: 'product_created',
            senderId: 'client-123',
            entityId: 'p3'
          };
          const noSourceMsg: RealTimeMessage = {
            type: 'product_created',
            entityId: 'p4'
          };

          expect(realTimeManager.isActionable(serverMsg)).toBe(true);
          expect(realTimeManager.isActionable(durableMsg)).toBe(true);
          expect(realTimeManager.isActionable(clientMsg)).toBe(true);
          expect(realTimeManager.isActionable(noSourceMsg)).toBe(false);
        });

        it('should prioritize source over senderId when both exist', () => {
          const message: RealTimeMessage = {
            type: 'schema_updated',
            source: 'server',
            senderId: 'ignored-sender',
            entityId: 'schema-123'
          };
          expect(realTimeManager.hasSender(message)).toBe(true);
          expect(realTimeManager.isActionable(message)).toBe(true);
        });
      });

      describe('Real-world server notification scenarios', () => {
        it('should handle API-triggered product creation', () => {
          const message: RealTimeMessage = {
            type: 'product_created',
            entityId: 'prod-uuid',
            entityType: 'product',
            source: 'durable-object',
            data: {
              id: 'prod-uuid',
              name: 'API Product',
              description: 'Created via REST API',
              createdAt: '2025-08-26T00:00:00Z',
              updatedAt: '2025-08-26T00:00:00Z',
              domains: []
            },
            timestamp: '2025-08-26T00:00:00Z'
          };

          expect(realTimeManager.isActionable(message)).toBe(true);
          expect(realTimeManager.hasData(message)).toBe(true);
        });

        it('should handle admin tool schema version status change', () => {
          const message: RealTimeMessage = {
            type: 'schema_version_updated',
            entityId: 'version-uuid',
            entityType: 'schema_version',
            source: 'server',
            data: {
              id: 'version-uuid',
              specification: 'event SchemaUpdated { ... }',
              semanticVersion: '2.0.0',
              description: 'Status changed via admin tool',
              status: 'Deprecated',
              updatedAt: '2025-08-26T00:00:00Z'
            },
            timestamp: '2025-08-26T00:00:00Z'
          };

          expect(realTimeManager.isActionable(message)).toBe(true);
          expect(realTimeManager.isVersionUpdate(message)).toBe(true);
          expect(realTimeManager.hasData(message)).toBe(true);
        });

        it('should handle bulk operations from migration scripts', () => {
          const messages: RealTimeMessage[] = [
            {
              type: 'schema_updated',
              source: 'durable-object',
              entityId: 'schema-1',
              entityType: 'schema',
              data: { name: 'Migrated Schema 1' }
            },
            {
              type: 'schema_updated',
              source: 'durable-object',
              entityId: 'schema-2',
              entityType: 'schema',
              data: { name: 'Migrated Schema 2' }
            },
            {
              type: 'schema_updated',
              source: 'durable-object',
              entityId: 'schema-3',
              entityType: 'schema',
              data: { name: 'Migrated Schema 3' }
            }
          ];

          messages.forEach(msg => {
            expect(realTimeManager.isActionable(msg)).toBe(true);
            expect(realTimeManager.hasData(msg)).toBe(true);
          });
        });

        it('should handle cascading deletions from server', () => {
          // When a product is deleted, all its domains, contexts, schemas, and versions are deleted
          const cascadeMessages: RealTimeMessage[] = [
            {
              type: 'version_deleted',
              source: 'server',
              entityId: 'version-1',
              entityType: 'version',
              data: { id: 'version-1' }
            },
            {
              type: 'schema_deleted',
              source: 'server',
              entityId: 'schema-1',
              entityType: 'schema',
              data: { id: 'schema-1' }
            },
            {
              type: 'context_deleted',
              source: 'server',
              entityId: 'context-1',
              entityType: 'context',
              data: { id: 'context-1' }
            },
            {
              type: 'domain_deleted',
              source: 'server',
              entityId: 'domain-1',
              entityType: 'domain',
              data: { id: 'domain-1' }
            },
            {
              type: 'product_deleted',
              source: 'server',
              entityId: 'product-1',
              entityType: 'product',
              data: { id: 'product-1' }
            }
          ];

          cascadeMessages.forEach(msg => {
            expect(realTimeManager.isActionable(msg)).toBe(true);
            expect(realTimeManager.hasData(msg)).toBe(true);
          });
        });
      });
    });
  });
});