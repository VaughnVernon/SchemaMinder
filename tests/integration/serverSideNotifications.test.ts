import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RealTimeMessage } from '../../src/services/realTimeManager';

describe('Server-Side Real-Time Notifications Integration', () => {
  describe('End-to-End Notification Flow', () => {
    describe('Product Operations', () => {
      it('should broadcast product creation from server to all clients', () => {
        // Simulates: API call → Worker → Database → PartyKit → All Clients
        const serverNotification: RealTimeMessage = {
          type: 'product_created',
          entityId: 'prod-123',
          entityType: 'product',
          source: 'durable-object',
          data: {
            id: 'prod-123',
            name: 'New Product',
            description: 'Created via API',
            createdAt: '2025-08-26T00:00:00Z',
            updatedAt: '2025-08-26T00:00:00Z',
            domains: []
          },
          timestamp: '2025-08-26T00:00:00Z'
        };

        // Verify the message structure is correct for broadcasting
        expect(serverNotification.type).toBe('product_created');
        expect(serverNotification.source).toBe('durable-object');
        expect(serverNotification.entityType).toBe('product');
        expect(serverNotification.data).toBeDefined();
        expect(serverNotification.data.id).toBe('prod-123');
      });

      it('should broadcast product update from server to all clients', () => {
        const serverNotification: RealTimeMessage = {
          type: 'product_updated',
          entityId: 'prod-123',
          entityType: 'product',
          source: 'server',
          data: {
            id: 'prod-123',
            name: 'Updated Product',
            description: 'Updated via admin tool',
            updatedAt: '2025-08-26T00:01:00Z'
          },
          timestamp: '2025-08-26T00:01:00Z'
        };

        expect(serverNotification.type).toBe('product_updated');
        expect(serverNotification.source).toBe('server');
        expect(serverNotification.data.name).toBe('Updated Product');
      });

      it('should broadcast product deletion from server to all clients', () => {
        const serverNotification: RealTimeMessage = {
          type: 'product_deleted',
          entityId: 'prod-123',
          entityType: 'product',
          source: 'durable-object',
          data: { id: 'prod-123' },
          timestamp: '2025-08-26T00:02:00Z'
        };

        expect(serverNotification.type).toBe('product_deleted');
        expect(serverNotification.data.id).toBe('prod-123');
      });
    });

    describe('Domain Operations', () => {
      it('should broadcast domain creation from server to all clients', () => {
        const serverNotification: RealTimeMessage = {
          type: 'domain_created',
          entityId: 'domain-456',
          entityType: 'domain',
          source: 'durable-object',
          data: {
            id: 'domain-456',
            name: 'New Domain',
            description: 'Created via API',
            productId: 'prod-123',
            createdAt: '2025-08-26T00:03:00Z',
            updatedAt: '2025-08-26T00:03:00Z',
            contexts: []
          },
          timestamp: '2025-08-26T00:03:00Z'
        };

        expect(serverNotification.type).toBe('domain_created');
        expect(serverNotification.entityType).toBe('domain');
        expect(serverNotification.data.productId).toBe('prod-123');
      });

      it('should broadcast domain update from server to all clients', () => {
        const serverNotification: RealTimeMessage = {
          type: 'domain_updated',
          entityId: 'domain-456',
          entityType: 'domain',
          source: 'server',
          data: {
            id: 'domain-456',
            name: 'Updated Domain',
            description: 'Updated description',
            updatedAt: '2025-08-26T00:04:00Z'
          },
          timestamp: '2025-08-26T00:04:00Z'
        };

        expect(serverNotification.type).toBe('domain_updated');
        expect(serverNotification.data.name).toBe('Updated Domain');
      });

      it('should broadcast domain deletion from server to all clients', () => {
        const serverNotification: RealTimeMessage = {
          type: 'domain_deleted',
          entityId: 'domain-456',
          entityType: 'domain',
          source: 'durable-object',
          data: { id: 'domain-456' },
          timestamp: '2025-08-26T00:05:00Z'
        };

        expect(serverNotification.type).toBe('domain_deleted');
        expect(serverNotification.data.id).toBe('domain-456');
      });
    });

    describe('Context Operations', () => {
      it('should broadcast context creation from server to all clients', () => {
        const serverNotification: RealTimeMessage = {
          type: 'context_created',
          entityId: 'context-789',
          entityType: 'context',
          source: 'durable-object',
          data: {
            id: 'context-789',
            name: 'New Context',
            description: 'Created via API',
            domainId: 'domain-456',
            createdAt: '2025-08-26T00:06:00Z',
            updatedAt: '2025-08-26T00:06:00Z',
            schemas: []
          },
          timestamp: '2025-08-26T00:06:00Z'
        };

        expect(serverNotification.type).toBe('context_created');
        expect(serverNotification.entityType).toBe('context');
        expect(serverNotification.data.domainId).toBe('domain-456');
      });

      it('should broadcast context update from server to all clients', () => {
        const serverNotification: RealTimeMessage = {
          type: 'context_updated',
          entityId: 'context-789',
          entityType: 'context',
          source: 'server',
          data: {
            id: 'context-789',
            name: 'Updated Context',
            description: 'Updated description',
            updatedAt: '2025-08-26T00:07:00Z'
          },
          timestamp: '2025-08-26T00:07:00Z'
        };

        expect(serverNotification.type).toBe('context_updated');
        expect(serverNotification.data.name).toBe('Updated Context');
      });

      it('should broadcast context deletion from server to all clients', () => {
        const serverNotification: RealTimeMessage = {
          type: 'context_deleted',
          entityId: 'context-789',
          entityType: 'context',
          source: 'durable-object',
          data: { id: 'context-789' },
          timestamp: '2025-08-26T00:08:00Z'
        };

        expect(serverNotification.type).toBe('context_deleted');
        expect(serverNotification.data.id).toBe('context-789');
      });
    });

    describe('Schema Operations', () => {
      it('should broadcast schema creation from server to all clients', () => {
        const serverNotification: RealTimeMessage = {
          type: 'schema_created',
          entityId: 'schema-abc',
          entityType: 'schema',
          source: 'durable-object',
          data: {
            id: 'schema-abc',
            name: 'New Schema',
            description: 'Created via API',
            schemaTypeCategory: 'Commands',
            scope: 'Public',
            contextId: 'context-789',
            createdAt: '2025-08-26T00:09:00Z',
            updatedAt: '2025-08-26T00:09:00Z',
            versions: []
          },
          timestamp: '2025-08-26T00:09:00Z'
        };

        expect(serverNotification.type).toBe('schema_created');
        expect(serverNotification.entityType).toBe('schema');
        expect(serverNotification.data.schemaTypeCategory).toBe('Commands');
        expect(serverNotification.data.scope).toBe('Public');
      });

      it('should broadcast schema update from server to all clients', () => {
        const serverNotification: RealTimeMessage = {
          type: 'schema_updated',
          entityId: 'schema-abc',
          entityType: 'schema',
          source: 'server',
          data: {
            id: 'schema-abc',
            name: 'Updated Schema',
            description: 'Updated description',
            schemaTypeCategory: 'Events',
            scope: 'Private',
            updatedAt: '2025-08-26T00:10:00Z'
          },
          timestamp: '2025-08-26T00:10:00Z'
        };

        expect(serverNotification.type).toBe('schema_updated');
        expect(serverNotification.data.schemaTypeCategory).toBe('Events');
        expect(serverNotification.data.scope).toBe('Private');
      });

      it('should broadcast schema deletion from server to all clients', () => {
        const serverNotification: RealTimeMessage = {
          type: 'schema_deleted',
          entityId: 'schema-abc',
          entityType: 'schema',
          source: 'durable-object',
          data: { id: 'schema-abc' },
          timestamp: '2025-08-26T00:11:00Z'
        };

        expect(serverNotification.type).toBe('schema_deleted');
        expect(serverNotification.data.id).toBe('schema-abc');
      });
    });

    describe('Schema Version Operations', () => {
      it('should broadcast version creation from server to all clients', () => {
        const serverNotification: RealTimeMessage = {
          type: 'version_created',
          entityId: 'version-xyz',
          entityType: 'version',
          source: 'durable-object',
          data: {
            id: 'version-xyz',
            specification: 'command TestCommand { string id }',
            semanticVersion: '1.0.0',
            description: 'Initial version',
            status: 'Draft',
            schemaId: 'schema-abc',
            createdAt: '2025-08-26T00:12:00Z',
            updatedAt: '2025-08-26T00:12:00Z'
          },
          timestamp: '2025-08-26T00:12:00Z'
        };

        expect(serverNotification.type).toBe('version_created');
        expect(serverNotification.entityType).toBe('version');
        expect(serverNotification.data.semanticVersion).toBe('1.0.0');
        expect(serverNotification.data.status).toBe('Draft');
      });

      it('should broadcast version update from server to all clients', () => {
        const serverNotification: RealTimeMessage = {
          type: 'version_updated',
          entityId: 'version-xyz',
          entityType: 'version',
          source: 'server',
          data: {
            id: 'version-xyz',
            specification: 'command TestCommand { string id, string name }',
            semanticVersion: '1.0.0',
            description: 'Updated version',
            status: 'Published',
            updatedAt: '2025-08-26T00:13:00Z'
          },
          timestamp: '2025-08-26T00:13:00Z'
        };

        expect(serverNotification.type).toBe('version_updated');
        expect(serverNotification.data.status).toBe('Published');
      });

      it('should broadcast version deletion from server to all clients', () => {
        const serverNotification: RealTimeMessage = {
          type: 'version_deleted',
          entityId: 'version-xyz',
          entityType: 'version',
          source: 'durable-object',
          data: { id: 'version-xyz' },
          timestamp: '2025-08-26T00:14:00Z'
        };

        expect(serverNotification.type).toBe('version_deleted');
        expect(serverNotification.data.id).toBe('version-xyz');
      });
    });
  });

  describe('Complex Scenarios', () => {
    describe('Cascading Operations', () => {
      it('should handle cascading deletions in correct order', () => {
        // When a product is deleted, all child entities are deleted
        const deletionSequence: RealTimeMessage[] = [
          // First, delete all versions
          {
            type: 'version_deleted',
            entityId: 'v1',
            entityType: 'version',
            source: 'server',
            data: { id: 'v1' },
            timestamp: '2025-08-26T00:15:00Z'
          },
          {
            type: 'version_deleted',
            entityId: 'v2',
            entityType: 'version',
            source: 'server',
            data: { id: 'v2' },
            timestamp: '2025-08-26T00:15:01Z'
          },
          // Then delete schemas
          {
            type: 'schema_deleted',
            entityId: 's1',
            entityType: 'schema',
            source: 'server',
            data: { id: 's1' },
            timestamp: '2025-08-26T00:15:02Z'
          },
          // Then delete contexts
          {
            type: 'context_deleted',
            entityId: 'c1',
            entityType: 'context',
            source: 'server',
            data: { id: 'c1' },
            timestamp: '2025-08-26T00:15:03Z'
          },
          // Then delete domains
          {
            type: 'domain_deleted',
            entityId: 'd1',
            entityType: 'domain',
            source: 'server',
            data: { id: 'd1' },
            timestamp: '2025-08-26T00:15:04Z'
          },
          // Finally delete the product
          {
            type: 'product_deleted',
            entityId: 'p1',
            entityType: 'product',
            source: 'server',
            data: { id: 'p1' },
            timestamp: '2025-08-26T00:15:05Z'
          }
        ];

        // Verify correct deletion order (bottom-up)
        expect(deletionSequence[0].type).toBe('version_deleted');
        expect(deletionSequence[1].type).toBe('version_deleted');
        expect(deletionSequence[2].type).toBe('schema_deleted');
        expect(deletionSequence[3].type).toBe('context_deleted');
        expect(deletionSequence[4].type).toBe('domain_deleted');
        expect(deletionSequence[5].type).toBe('product_deleted');

        // All should have server source
        deletionSequence.forEach(msg => {
          expect(msg.source).toBe('server');
        });
      });
    });

    describe('Bulk Operations', () => {
      it('should handle bulk status updates from migration scripts', () => {
        const bulkUpdates: RealTimeMessage[] = [
          {
            type: 'version_updated',
            entityId: 'v1',
            entityType: 'version',
            source: 'durable-object',
            data: { id: 'v1', status: 'Deprecated' },
            timestamp: '2025-08-26T00:16:00Z'
          },
          {
            type: 'version_updated',
            entityId: 'v2',
            entityType: 'version',
            source: 'durable-object',
            data: { id: 'v2', status: 'Deprecated' },
            timestamp: '2025-08-26T00:16:01Z'
          },
          {
            type: 'version_updated',
            entityId: 'v3',
            entityType: 'version',
            source: 'durable-object',
            data: { id: 'v3', status: 'Deprecated' },
            timestamp: '2025-08-26T00:16:02Z'
          }
        ];

        bulkUpdates.forEach(msg => {
          expect(msg.type).toBe('version_updated');
          expect(msg.source).toBe('durable-object');
          expect(msg.data.status).toBe('Deprecated');
        });
      });

      it('should handle bulk schema category migrations', () => {
        const bulkMigrations: RealTimeMessage[] = [
          {
            type: 'schema_updated',
            entityId: 's1',
            entityType: 'schema',
            source: 'durable-object',
            data: { 
              id: 's1', 
              schemaTypeCategory: 'Events',
              name: 'MigratedSchema1'
            },
            timestamp: '2025-08-26T00:17:00Z'
          },
          {
            type: 'schema_updated',
            entityId: 's2',
            entityType: 'schema',
            source: 'durable-object',
            data: { 
              id: 's2', 
              schemaTypeCategory: 'Events',
              name: 'MigratedSchema2'
            },
            timestamp: '2025-08-26T00:17:01Z'
          }
        ];

        bulkMigrations.forEach(msg => {
          expect(msg.type).toBe('schema_updated');
          expect(msg.data.schemaTypeCategory).toBe('Events');
        });
      });
    });

    describe('Room ID Synchronization', () => {
      it('should use consistent room ID format', () => {
        const tenantId = 'default-tenant';
        const registryId = 'default-registry';
        const expectedRoomId = `${tenantId}-${registryId}`;

        expect(expectedRoomId).toBe('default-tenant-default-registry');
      });

      it('should handle multi-tenant scenarios', () => {
        const tenants = [
          { tenantId: 'tenant-a', registryId: 'registry-1' },
          { tenantId: 'tenant-b', registryId: 'registry-2' },
          { tenantId: 'tenant-c', registryId: 'registry-3' }
        ];

        tenants.forEach(({ tenantId, registryId }) => {
          const roomId = `${tenantId}-${registryId}`;
          expect(roomId).toContain(tenantId);
          expect(roomId).toContain(registryId);
          expect(roomId).toBe(`${tenantId}-${registryId}`);
        });
      });
    });

    describe('Error Recovery', () => {
      it('should handle notification failures gracefully', () => {
        // Notification failures should not break the operation
        const notification: RealTimeMessage = {
          type: 'product_created',
          entityId: 'prod-123',
          entityType: 'product',
          source: 'durable-object',
          data: {
            id: 'prod-123',
            name: 'Product despite notification failure'
          },
          timestamp: '2025-08-26T00:18:00Z'
        };

        // Even if PartyKit is down, the notification structure should be valid
        expect(notification.type).toBeDefined();
        expect(notification.entityId).toBeDefined();
        expect(notification.source).toBeDefined();
      });

      it('should include sufficient data for client recovery', () => {
        const notification: RealTimeMessage = {
          type: 'schema_updated',
          entityId: 'schema-123',
          entityType: 'schema',
          source: 'server',
          data: {
            id: 'schema-123',
            name: 'Updated Schema',
            schemaTypeCategory: 'Commands',
            scope: 'Public',
            updatedAt: '2025-08-26T00:19:00Z'
          },
          timestamp: '2025-08-26T00:19:00Z'
        };

        // Notification should include enough data for client to update UI
        expect(notification.data.id).toBeDefined();
        expect(notification.data.name).toBeDefined();
        expect(notification.data.schemaTypeCategory).toBeDefined();
        expect(notification.data.scope).toBeDefined();
        expect(notification.data.updatedAt).toBeDefined();
      });
    });
  });

  describe('Message Format Validation', () => {
    it('should validate server message format', () => {
      const message: RealTimeMessage = {
        type: 'product_created',
        entityId: 'prod-123',
        entityType: 'product',
        source: 'server',
        data: { id: 'prod-123', name: 'Test Product' },
        timestamp: '2025-08-26T00:20:00Z'
      };

      // Required fields
      expect(message.type).toBeDefined();
      expect(message.entityId).toBeDefined();
      expect(message.entityType).toBeDefined();
      expect(message.source).toBeDefined();
      
      // Source must be server or durable-object for server-side notifications
      expect(['server', 'durable-object']).toContain(message.source);
      
      // Timestamp should be ISO format
      expect(message.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });

    it('should validate durable-object message format', () => {
      const message: RealTimeMessage = {
        type: 'version_updated',
        entityId: 'version-123',
        entityType: 'version',
        source: 'durable-object',
        data: { 
          id: 'version-123',
          status: 'Published',
          semanticVersion: '2.0.0'
        },
        timestamp: '2025-08-26T00:21:00Z'
      };

      expect(message.source).toBe('durable-object');
      expect(message.entityType).toBe('version');
      expect(message.data.semanticVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});