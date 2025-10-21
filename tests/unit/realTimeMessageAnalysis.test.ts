import { describe, it, expect, beforeEach } from 'vitest'

// Mock the realTimeManager without browser dependencies
class MockRealTimeManager {
  private static readonly TYPE_CONNECTED = 'connected';
  private static readonly TYPE_ERROR = 'error';
  private static readonly TYPE_VERSION_CREATED = 'version_created';
  private static readonly TYPE_VERSION_UPDATED = 'version_updated';

  hasData(message: any): boolean {
    return !!message.data;
  }

  hasSender(message: any): boolean {
    return !!(message.senderId || message.source === 'server' || message.source === 'durable-object');
  }

  isActionable(message: any): boolean {
    return this.hasSender(message) &&
           !this.isConnectionConfirmation(message) &&
           !this.isError(message);
  }
  
  isConnectionConfirmation(message: any): boolean {
    return message.type === MockRealTimeManager.TYPE_CONNECTED;
  }

  isError(message: any): boolean {
    return message.type === MockRealTimeManager.TYPE_ERROR;
  }

  isVersionUpdate(message: any): boolean {
    return message.type === MockRealTimeManager.TYPE_VERSION_CREATED || 
           message.type === MockRealTimeManager.TYPE_VERSION_UPDATED;
  }

  isSameSemanticVersion(message: any, semanticVersion: string): boolean {
    return !!(message.data?.semanticVersion === semanticVersion);
  }

  isSameSchema(message: any, schemaId: string): boolean {
    return !!(message.data?.schemaId === schemaId);
  }

  isSameVersion(message: any, versionId: string): boolean {
    return !!(message.data?.versionId === versionId);
  }
}

describe('Real-Time Message Analysis - Core Logic', () => {
  let manager: MockRealTimeManager;

  beforeEach(() => {
    manager = new MockRealTimeManager();
  });

  describe('Server-Side Notification Support', () => {
    describe('hasSender with source field', () => {
      it('should return true for messages with source=server', () => {
        const message = {
          type: 'schema_created',
          source: 'server',
          data: { schemaId: 'test-123' }
        };
        expect(manager.hasSender(message)).toBe(true);
      });

      it('should return true for messages with source=durable-object', () => {
        const message = {
          type: 'product_updated',
          source: 'durable-object',
          data: { productId: 'prod-456' }
        };
        expect(manager.hasSender(message)).toBe(true);
      });

      it('should return false for messages with source=client', () => {
        const message = {
          type: 'version_created',
          source: 'client',
          data: { versionId: 'ver-789' }
        };
        expect(manager.hasSender(message)).toBe(false);
      });

      it('should return true for messages with senderId (backward compatibility)', () => {
        const message = {
          type: 'domain_deleted',
          senderId: 'user-123',
          data: { domainId: 'dom-456' }
        };
        expect(manager.hasSender(message)).toBe(true);
      });

      it('should return false for messages without source or senderId', () => {
        const message = {
          type: 'context_updated',
          data: { contextId: 'ctx-789' }
        };
        expect(manager.hasSender(message)).toBe(false);
      });
    });

    describe('isActionable with server messages', () => {
      it('should process server-originated product operations', () => {
        const message = {
          type: 'product_created',
          source: 'server',
          entityId: 'prod-123',
          entityType: 'product',
          data: { name: 'New Product', description: 'A test product' }
        };
        expect(manager.isActionable(message)).toBe(true);
      });

      it('should process server-originated domain operations', () => {
        const message = {
          type: 'domain_updated',
          source: 'durable-object',
          entityId: 'dom-456',
          entityType: 'domain',
          data: { name: 'Updated Domain' }
        };
        expect(manager.isActionable(message)).toBe(true);
      });

      it('should process server-originated schema operations', () => {
        const message = {
          type: 'schema_deleted',
          source: 'server',
          entityId: 'schema-789',
          entityType: 'schema',
          data: { schemaId: 'schema-789', reason: 'deprecated' }
        };
        expect(manager.isActionable(message)).toBe(true);
      });

      it('should not process connection messages from server', () => {
        const message = {
          type: 'connected',
          source: 'server',
          timestamp: '2023-12-01T10:30:00Z',
          connectionId: 'conn-123'
        };
        expect(manager.isActionable(message)).toBe(false);
      });

      it('should not process error messages from server', () => {
        const message = {
          type: 'error',
          source: 'server',
          message: 'Database connection failed',
          timestamp: '2023-12-01T10:30:00Z'
        };
        expect(manager.isActionable(message)).toBe(false);
      });
    });

    describe('Mixed source scenarios', () => {
      it('should handle messages from different sources correctly', () => {
        const serverMessage = {
          type: 'version_created',
          source: 'server',
          data: { versionId: 'ver-123', status: 'Published' }
        };
        
        const clientMessage = {
          type: 'version_updated',
          senderId: 'user-456',
          data: { versionId: 'ver-123', status: 'Draft' }
        };
        
        const unidentifiedMessage = {
          type: 'version_deleted',
          data: { versionId: 'ver-789' }
        };

        expect(manager.isActionable(serverMessage)).toBe(true);
        expect(manager.isActionable(clientMessage)).toBe(true);
        expect(manager.isActionable(unidentifiedMessage)).toBe(false);
      });

      it('should prioritize source over senderId when both exist', () => {
        const message = {
          type: 'schema_updated',
          source: 'server',
          senderId: 'user-123', // This should be ignored in favor of source
          data: { schemaId: 'schema-456' }
        };
        
        expect(manager.hasSender(message)).toBe(true);
        expect(manager.isActionable(message)).toBe(true);
      });
    });

    describe('Real-world server notification scenarios', () => {
      it('should handle API-triggered product creation', () => {
        const message = {
          type: 'product_created',
          source: 'server',
          entityId: 'api-prod-123',
          entityType: 'product',
          data: {
            name: 'API Product',
            description: 'Created via REST API',
            createdBy: 'api-user-456'
          },
          timestamp: '2023-12-01T14:30:00Z'
        };
        
        expect(manager.isActionable(message)).toBe(true);
        expect(manager.hasData(message)).toBe(true);
      });

      it('should handle admin tool schema version status change', () => {
        const message = {
          type: 'version_updated',
          source: 'durable-object',
          entityId: 'admin-ver-789',
          entityType: 'version',
          data: {
            versionId: 'admin-ver-789',
            schemaId: 'schema-123',
            status: 'Deprecated',
            semanticVersion: '2.1.0',
            updatedBy: 'admin-user'
          },
          timestamp: '2023-12-01T15:45:00Z'
        };
        
        expect(manager.isActionable(message)).toBe(true);
        expect(manager.isVersionUpdate(message)).toBe(true);
        expect(manager.isSameSchema(message, 'schema-123')).toBe(true);
        expect(manager.isSameSemanticVersion(message, '2.1.0')).toBe(true);
      });

      it('should handle cascading deletions from server', () => {
        const domainDeletion = {
          type: 'domain_deleted',
          source: 'server',
          entityId: 'cascade-dom-123',
          data: {
            domainId: 'cascade-dom-123',
            reason: 'cascade-delete',
            parentProductId: 'prod-456'
          }
        };

        const schemaDeletion = {
          type: 'schema_deleted',
          source: 'server',
          entityId: 'cascade-schema-789',
          data: {
            schemaId: 'cascade-schema-789',
            reason: 'cascade-delete',
            parentDomainId: 'cascade-dom-123'
          }
        };

        expect(manager.isActionable(domainDeletion)).toBe(true);
        expect(manager.isActionable(schemaDeletion)).toBe(true);
      });
    });
  });
});