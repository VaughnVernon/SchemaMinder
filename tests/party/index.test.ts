import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SchemaRegistryServer, { SchemaRegistryMessage } from '../../party/index';

// Mock PartyKit types
const mockConnection = {
  id: 'connection-123',
  send: vi.fn(),
};

const mockRoom = {
  id: 'room-456',
  broadcast: vi.fn(),
  getConnections: vi.fn(() => ({ size: 2 })),
};

const mockConnectionContext = {};

describe('SchemaRegistryServer', () => {
  let server: SchemaRegistryServer;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new SchemaRegistryServer(mockRoom as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with room', () => {
      expect(server).toBeDefined();
      expect((server as any).room).toBe(mockRoom);
    });
  });

  describe('onConnect', () => {
    it('should send welcome message to new connection', () => {
      const fixedTimestamp = '2023-12-01T10:00:00.000Z';
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedTimestamp);
      
      server.onConnect(mockConnection as any, mockConnectionContext as any);

      expect(mockConnection.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'connected',
          timestamp: fixedTimestamp,
          connectionId: 'connection-123'
        })
      );
    });

    it('should log connection event', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      server.onConnect(mockConnection as any, mockConnectionContext as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Connection connection-123 joined room room-456'
      );
    });
  });

  describe('onMessage', () => {
    const validMessage: SchemaRegistryMessage = {
      type: 'schema_created',
      entityId: 'entity-123',
      entityType: 'schema',
      data: { name: 'Test Schema' },
      timestamp: '2023-12-01T09:00:00.000Z',
      userId: 'user-456'
    };

    it('should parse and broadcast valid message', () => {
      const fixedTimestamp = '2023-12-01T10:00:00.000Z';
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedTimestamp);

      server.onMessage(JSON.stringify(validMessage), mockConnection as any);

      expect(mockRoom.broadcast).toHaveBeenCalledWith(
        JSON.stringify({
          ...validMessage,
          timestamp: fixedTimestamp,
          senderId: 'connection-123'
        }),
        ['connection-123']
      );
    });

    it('should log broadcast event', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      server.onMessage(JSON.stringify(validMessage), mockConnection as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Broadcasting schema_created for schema:entity-123'
      );
    });

    it('should handle all message types', () => {
      const messageTypes: SchemaRegistryMessage['type'][] = [
        'schema_created', 'schema_updated', 'schema_deleted',
        'version_created', 'version_updated', 'version_deleted',
        'product_created', 'product_updated', 'product_deleted',
        'domain_created', 'domain_updated', 'domain_deleted',
        'context_created', 'context_updated', 'context_deleted'
      ];

      messageTypes.forEach(type => {
        vi.clearAllMocks();
        const message = { ...validMessage, type };
        
        server.onMessage(JSON.stringify(message), mockConnection as any);
        
        expect(mockRoom.broadcast).toHaveBeenCalled();
      });
    });

    it('should handle all entity types', () => {
      const entityTypes: SchemaRegistryMessage['entityType'][] = [
        'product', 'domain', 'context', 'schema', 'version'
      ];

      entityTypes.forEach(entityType => {
        vi.clearAllMocks();
        const message = { ...validMessage, entityType };
        
        server.onMessage(JSON.stringify(message), mockConnection as any);
        
        expect(mockRoom.broadcast).toHaveBeenCalled();
      });
    });

    it('should handle message without userId', () => {
      const messageWithoutUserId = {
        type: 'schema_created' as const,
        entityId: 'entity-123',
        entityType: 'schema' as const,
        data: { name: 'Test Schema' },
        timestamp: '2023-12-01T09:00:00.000Z'
      };

      server.onMessage(JSON.stringify(messageWithoutUserId), mockConnection as any);

      expect(mockRoom.broadcast).toHaveBeenCalled();
    });

    it('should send error message for invalid JSON', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const fixedTimestamp = '2023-12-01T10:00:00.000Z';
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedTimestamp);

      server.onMessage('invalid json', mockConnection as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse message:',
        expect.any(Error)
      );

      expect(mockConnection.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: fixedTimestamp
        })
      );

      expect(mockRoom.broadcast).not.toHaveBeenCalled();
    });

    it('should send error message for empty string', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      server.onMessage('', mockConnection as any);

      expect(consoleSpy).toHaveBeenCalled();
      expect(mockConnection.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
    });

    it('should send error message for null message', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      server.onMessage('null', mockConnection as any);

      expect(consoleSpy).toHaveBeenCalled();
      expect(mockConnection.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
    });

    it('should exclude sender from broadcast recipients', () => {
      server.onMessage(JSON.stringify(validMessage), mockConnection as any);

      expect(mockRoom.broadcast).toHaveBeenCalledWith(
        expect.any(String),
        ['connection-123']
      );
    });

    it('should add server timestamp to broadcast message', () => {
      const fixedTimestamp = '2023-12-01T10:00:00.000Z';
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedTimestamp);

      server.onMessage(JSON.stringify(validMessage), mockConnection as any);

      const broadcastCall = mockRoom.broadcast.mock.calls[0][0];
      const parsedMessage = JSON.parse(broadcastCall);
      
      expect(parsedMessage.timestamp).toBe(fixedTimestamp);
      expect(parsedMessage.senderId).toBe('connection-123');
    });

    it('should preserve original message data', () => {
      server.onMessage(JSON.stringify(validMessage), mockConnection as any);

      const broadcastCall = mockRoom.broadcast.mock.calls[0][0];
      const parsedMessage = JSON.parse(broadcastCall);
      
      expect(parsedMessage.type).toBe(validMessage.type);
      expect(parsedMessage.entityId).toBe(validMessage.entityId);
      expect(parsedMessage.entityType).toBe(validMessage.entityType);
      expect(parsedMessage.data).toEqual(validMessage.data);
      expect(parsedMessage.userId).toBe(validMessage.userId);
    });
  });

  describe('onClose', () => {
    it('should log connection close event', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      server.onClose(mockConnection as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Connection connection-123 left room room-456'
      );
    });
  });

  describe('onError', () => {
    it('should log connection error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const testError = new Error('Test connection error');

      server.onError(mockConnection as any, testError);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Connection connection-123 error:',
        testError
      );
    });

    it('should handle different error types', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Test with string error
      server.onError(mockConnection as any, 'String error' as any);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Connection connection-123 error:',
        'String error'
      );

      // Test with object error
      const objectError = { message: 'Object error' };
      server.onError(mockConnection as any, objectError as any);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Connection connection-123 error:',
        objectError
      );
    });
  });

  describe('onRequest - HTTP Endpoints', () => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    describe('OPTIONS requests', () => {
      it('should handle OPTIONS request with CORS headers', async () => {
        const mockRequest = {
          method: 'OPTIONS'
        } as Request;

        const response = await server.onRequest(mockRequest as any);

        expect(response.status).toBe(200);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
        expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
      });
    });

    describe('POST requests', () => {
      const validPostMessage: SchemaRegistryMessage = {
        type: 'schema_created',
        entityId: 'entity-789',
        entityType: 'schema',
        data: { name: 'HTTP Test Schema' },
        timestamp: '2023-12-01T09:00:00.000Z',
        userId: 'user-789'
      };

      it('should broadcast POST message to all clients', async () => {
        const fixedTimestamp = '2023-12-01T10:00:00.000Z';
        vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedTimestamp);

        const mockRequest = {
          method: 'POST',
          json: vi.fn().mockResolvedValue(validPostMessage)
        } as any;

        const response = await server.onRequest(mockRequest);

        expect(mockRequest.json).toHaveBeenCalled();
        expect(mockRoom.broadcast).toHaveBeenCalledWith(
          JSON.stringify({
            ...validPostMessage,
            timestamp: fixedTimestamp,
            source: 'server'
          })
        );

        const responseText = await response.text();
        expect(JSON.parse(responseText)).toEqual({ success: true });
        expect(response.status).toBe(200);
      });

      it('should return success response with CORS headers', async () => {
        const mockRequest = {
          method: 'POST',
          json: vi.fn().mockResolvedValue(validPostMessage)
        } as any;

        const response = await server.onRequest(mockRequest);

        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Content-Type')).toBe('application/json');
      });

      it('should handle POST request with invalid JSON', async () => {
        const mockRequest = {
          method: 'POST',
          json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
        } as any;

        const response = await server.onRequest(mockRequest);

        expect(response.status).toBe(400);
        const responseText = await response.text();
        expect(JSON.parse(responseText)).toEqual({ error: 'Invalid request' });
      });

      it('should add server timestamp and source to broadcast message', async () => {
        const fixedTimestamp = '2023-12-01T10:00:00.000Z';
        vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedTimestamp);

        const mockRequest = {
          method: 'POST',
          json: vi.fn().mockResolvedValue(validPostMessage)
        } as any;

        await server.onRequest(mockRequest);

        const broadcastCall = mockRoom.broadcast.mock.calls[0][0];
        const parsedMessage = JSON.parse(broadcastCall);
        
        expect(parsedMessage.timestamp).toBe(fixedTimestamp);
        expect(parsedMessage.source).toBe('server');
      });

      it('should broadcast to all connections for POST requests', async () => {
        const mockRequest = {
          method: 'POST',
          json: vi.fn().mockResolvedValue(validPostMessage)
        } as any;

        await server.onRequest(mockRequest);

        // POST broadcasts should not exclude any connections (no second parameter)
        expect(mockRoom.broadcast).toHaveBeenCalledWith(expect.any(String));
        expect(mockRoom.broadcast.mock.calls[0]).toHaveLength(1);
      });
    });

    describe('GET requests', () => {
      it('should return health check response', async () => {
        const fixedTimestamp = '2023-12-01T10:00:00.000Z';
        vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedTimestamp);

        const mockRequest = {
          method: 'GET'
        } as Request;

        const response = await server.onRequest(mockRequest as any);

        expect(response.status).toBe(200);
        const responseText = await response.text();
        const responseData = JSON.parse(responseText);

        expect(responseData).toEqual({
          status: 'healthy',
          room: 'room-456',
          connections: 2,
          timestamp: fixedTimestamp
        });
      });

      it('should include CORS headers in health check response', async () => {
        const mockRequest = {
          method: 'GET'
        } as Request;

        const response = await server.onRequest(mockRequest as any);

        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Content-Type')).toBe('application/json');
      });

      it('should return current connection count', async () => {
        // Mock different connection counts
        mockRoom.getConnections.mockReturnValue({ size: 5 });

        const mockRequest = {
          method: 'GET'
        } as Request;

        const response = await server.onRequest(mockRequest as any);
        const responseText = await response.text();
        const responseData = JSON.parse(responseText);

        expect(responseData.connections).toBe(5);
      });

      it('should return current room ID', async () => {
        const mockRequest = {
          method: 'GET'
        } as Request;

        const response = await server.onRequest(mockRequest as any);
        const responseText = await response.text();
        const responseData = JSON.parse(responseText);

        expect(responseData.room).toBe('room-456');
      });
    });

    describe('Unsupported methods', () => {
      it('should return 405 for PUT requests', async () => {
        const mockRequest = {
          method: 'PUT'
        } as Request;

        const response = await server.onRequest(mockRequest as any);

        expect(response.status).toBe(405);
        const responseText = await response.text();
        expect(responseText).toBe('Method not allowed');
      });

      it('should return 405 for DELETE requests', async () => {
        const mockRequest = {
          method: 'DELETE'
        } as Request;

        const response = await server.onRequest(mockRequest as any);

        expect(response.status).toBe(405);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      });

      it('should return 405 for PATCH requests', async () => {
        const mockRequest = {
          method: 'PATCH'
        } as Request;

        const response = await server.onRequest(mockRequest as any);

        expect(response.status).toBe(405);
      });

      it('should include CORS headers in 405 responses', async () => {
        const mockRequest = {
          method: 'PUT'
        } as Request;

        const response = await server.onRequest(mockRequest as any);

        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
      });
    });
  });

  describe('Message Types Integration', () => {
    it('should handle complete schema lifecycle', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const schemaCreated: SchemaRegistryMessage = {
        type: 'schema_created',
        entityId: 'schema-123',
        entityType: 'schema',
        data: { name: 'User Schema' },
        timestamp: '2023-12-01T09:00:00.000Z'
      };

      const schemaUpdated: SchemaRegistryMessage = {
        type: 'schema_updated',
        entityId: 'schema-123',
        entityType: 'schema',
        data: { name: 'Updated User Schema' },
        timestamp: '2023-12-01T09:01:00.000Z'
      };

      const schemaDeleted: SchemaRegistryMessage = {
        type: 'schema_deleted',
        entityId: 'schema-123',
        entityType: 'schema',
        data: {},
        timestamp: '2023-12-01T09:02:00.000Z'
      };

      server.onMessage(JSON.stringify(schemaCreated), mockConnection as any);
      server.onMessage(JSON.stringify(schemaUpdated), mockConnection as any);
      server.onMessage(JSON.stringify(schemaDeleted), mockConnection as any);

      expect(mockRoom.broadcast).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledWith('Broadcasting schema_created for schema:schema-123');
      expect(consoleSpy).toHaveBeenCalledWith('Broadcasting schema_updated for schema:schema-123');
      expect(consoleSpy).toHaveBeenCalledWith('Broadcasting schema_deleted for schema:schema-123');
    });

    it('should handle version lifecycle messages', () => {
      const versionMessages = [
        { type: 'version_created' as const, entityType: 'version' as const },
        { type: 'version_updated' as const, entityType: 'version' as const },
        { type: 'version_deleted' as const, entityType: 'version' as const }
      ];

      versionMessages.forEach(({ type, entityType }) => {
        vi.clearAllMocks();
        
        const message: SchemaRegistryMessage = {
          type,
          entityId: 'version-456',
          entityType,
          data: { version: '1.0.0' },
          timestamp: '2023-12-01T09:00:00.000Z'
        };

        server.onMessage(JSON.stringify(message), mockConnection as any);
        expect(mockRoom.broadcast).toHaveBeenCalled();
      });
    });

    it('should handle hierarchical entity messages', () => {
      const hierarchyMessages: Array<{ type: SchemaRegistryMessage['type'], entityType: SchemaRegistryMessage['entityType'] }> = [
        { type: 'product_created', entityType: 'product' },
        { type: 'domain_created', entityType: 'domain' },
        { type: 'context_created', entityType: 'context' },
        { type: 'schema_created', entityType: 'schema' }
      ];

      hierarchyMessages.forEach(({ type, entityType }) => {
        vi.clearAllMocks();
        
        const message: SchemaRegistryMessage = {
          type,
          entityId: `${entityType}-123`,
          entityType,
          data: { name: `Test ${entityType}` },
          timestamp: '2023-12-01T09:00:00.000Z'
        };

        server.onMessage(JSON.stringify(message), mockConnection as any);
        expect(mockRoom.broadcast).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle malformed message structure', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Valid JSON but missing required fields
      const malformedMessage = {
        type: 'schema_created',
        // Missing entityId, entityType, data, timestamp
      };

      server.onMessage(JSON.stringify(malformedMessage), mockConnection as any);

      expect(mockRoom.broadcast).toHaveBeenCalled(); // Still broadcasts, TypeScript would catch this
      expect(consoleSpy).not.toHaveBeenCalled(); // No parsing error, just missing fields
    });

    it('should handle very large message data', () => {
      const largeData = {
        specification: 'a'.repeat(10000), // 10KB string
        metadata: Array(1000).fill({ key: 'value' }) // Large array
      };

      const largeMessage: SchemaRegistryMessage = {
        type: 'schema_created',
        entityId: 'large-schema',
        entityType: 'schema',
        data: largeData,
        timestamp: '2023-12-01T09:00:00.000Z'
      };

      expect(() => {
        server.onMessage(JSON.stringify(largeMessage), mockConnection as any);
      }).not.toThrow();

      expect(mockRoom.broadcast).toHaveBeenCalled();
    });

    it('should handle special characters in message data', () => {
      const specialData = {
        name: 'Schema with "quotes" and \'apostrophes\'',
        description: 'Contains <xml> tags and & symbols',
        unicode: '🔥 Unicode emoji and 中文字符'
      };

      const unicodeMessage: SchemaRegistryMessage = {
        type: 'schema_created',
        entityId: 'unicode-schema',
        entityType: 'schema',
        data: specialData,
        timestamp: '2023-12-01T09:00:00.000Z'
      };

      expect(() => {
        server.onMessage(JSON.stringify(unicodeMessage), mockConnection as any);
      }).not.toThrow();

      expect(mockRoom.broadcast).toHaveBeenCalled();
    });
  });

  describe('Timestamp Handling', () => {
    it('should override original timestamp with server timestamp', () => {
      const originalTimestamp = '2023-12-01T08:00:00.000Z';
      const serverTimestamp = '2023-12-01T10:00:00.000Z';
      
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(serverTimestamp);

      const message: SchemaRegistryMessage = {
        type: 'schema_created',
        entityId: 'schema-123',
        entityType: 'schema',
        data: { name: 'Test Schema' },
        timestamp: originalTimestamp,
        userId: 'user-123'
      };

      server.onMessage(JSON.stringify(message), mockConnection as any);

      const broadcastCall = mockRoom.broadcast.mock.calls[0][0];
      const parsedMessage = JSON.parse(broadcastCall);
      
      expect(parsedMessage.timestamp).toBe(serverTimestamp);
      expect(parsedMessage.timestamp).not.toBe(originalTimestamp);
    });

    it('should add timestamp to HTTP POST broadcasts', async () => {
      const serverTimestamp = '2023-12-01T11:00:00.000Z';
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(serverTimestamp);

      const message: SchemaRegistryMessage = {
        type: 'schema_created',
        entityId: 'http-schema',
        entityType: 'schema',
        data: { name: 'HTTP Test Schema' },
        timestamp: '2023-12-01T09:00:00.000Z'
      };

      const mockRequest = {
        method: 'POST',
        json: vi.fn().mockResolvedValue(message)
      } as any;

      await server.onRequest(mockRequest);

      const broadcastCall = mockRoom.broadcast.mock.calls[0][0];
      const parsedMessage = JSON.parse(broadcastCall);
      
      expect(parsedMessage.timestamp).toBe(serverTimestamp);
      expect(parsedMessage.source).toBe('server');
    });
  });
});