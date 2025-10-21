import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../../src/services/apiClient';
import { Product, Domain, Context, Schema, SchemaVersion } from '../../src/types/schema';

// Create mock fetch function
const mockFetch = vi.fn();

describe('ApiClient', () => {
  // Setup and teardown fetch mock for this test suite only
  beforeAll(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    mockFetch.mockClear();
    // Setup window.location for each test
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'localhost',
        host: 'localhost:3000'
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Base URL Configuration', () => {
    it('should use localhost URL for development', () => {
      window.location.hostname = 'localhost';
      expect(apiClient.getTenantInfo().baseUrl).toBe('http://localhost:8789');
    });

    it('should use empty string for production', () => {
      window.location.hostname = 'example.com';
      expect(apiClient.getTenantInfo().baseUrl).toBe('');
    });
  });

  describe('Request Helper', () => {
    it('should make successful requests with correct headers', async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.getProducts();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8789/schema-registry/api/default-tenant/default-registry/products',
        {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle HTTP errors correctly', async () => {
      const errorResponse = { error: 'Not Found' };
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(errorResponse),
      });

      await expect(apiClient.getProducts()).rejects.toThrow('Not Found');
    });

    it('should handle unparseable error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(apiClient.getProducts()).rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });

  describe('Products API', () => {
    const mockProduct: Product = {
      id: 'product-1',
      name: 'Test Product',
      description: 'Test description',
      createdAt: '2023-01-01',
      domains: []
    };

    it('should get products', async () => {
      const mockResponse = { products: [mockProduct] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.getProducts();
      expect(result).toEqual(mockResponse);
    });

    it('should create product with correct payload', async () => {
      const productData = { name: 'New Product', description: 'New description' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProduct),
      });

      const result = await apiClient.createProduct(productData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/products'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(productData),
        })
      );
      expect(result).toEqual(mockProduct);
    });

    it('should update product', async () => {
      const updates = { name: 'Updated Name' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...mockProduct, ...updates }),
      });

      const result = await apiClient.updateProduct('product-1', updates);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/products/product-1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
      expect(result.name).toBe('Updated Name');
    });

    it('should delete product', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(undefined),
      });

      await apiClient.deleteProduct('product-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/products/product-1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Domains API', () => {
    const mockDomain: Domain = {
      id: 'domain-1',
      name: 'Test Domain',
      description: 'Test description',
      productId: 'product-1',
      createdAt: '2023-01-01',
      contexts: []
    };

    it('should get domains', async () => {
      const mockResponse = { domains: [mockDomain] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.getDomains();
      expect(result).toEqual(mockResponse);
    });

    it('should create domain with productId', async () => {
      const domainData = { name: 'New Domain', description: 'New description', productId: 'product-1' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockDomain),
      });

      const result = await apiClient.createDomain(domainData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/domains'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(domainData),
        })
      );
      expect(result).toEqual(mockDomain);
    });

    it('should update domain', async () => {
      const updates = { name: 'Updated Domain' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...mockDomain, ...updates }),
      });

      await apiClient.updateDomain('domain-1', updates);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/domains/domain-1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
    });

    it('should delete domain', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(undefined),
      });

      await apiClient.deleteDomain('domain-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/domains/domain-1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Contexts API', () => {
    const mockContext: Context = {
      id: 'context-1',
      name: 'Test Context',
      description: 'Test description',
      domainId: 'domain-1',
      createdAt: '2023-01-01',
      schemas: []
    };

    it('should get contexts', async () => {
      const mockResponse = { contexts: [mockContext] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.getContexts();
      expect(result).toEqual(mockResponse);
    });

    it('should create context with domainId', async () => {
      const contextData = { name: 'New Context', description: 'New description', domainId: 'domain-1' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContext),
      });

      const result = await apiClient.createContext(contextData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/contexts'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(contextData),
        })
      );
      expect(result).toEqual(mockContext);
    });
  });

  describe('Schemas API', () => {
    const mockSchema: Schema = {
      id: 'schema-1',
      name: 'Test Schema',
      description: 'Test description',
      schemaTypeCategory: 'Commands',
      scope: 'Private',
      contextId: 'context-1',
      createdAt: '2023-01-01',
      versions: []
    };

    it('should get schemas', async () => {
      const mockResponse = { schemas: [mockSchema] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.getSchemas();
      expect(result).toEqual(mockResponse);
    });

    it('should create schema with all required fields', async () => {
      const schemaData = {
        name: 'New Schema',
        description: 'New description',
        schemaTypeCategory: 'Commands',
        scope: 'Private' as const,
        contextId: 'context-1'
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSchema),
      });

      const result = await apiClient.createSchema(schemaData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/schemas'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(schemaData),
        })
      );
      expect(result).toEqual(mockSchema);
    });

    it('should update schema with versions', async () => {
      const updates = {
        name: 'Updated Schema',
        versions: [{
          versionId: 'v1',
          specification: 'command Test {}',
          semanticVersion: '1.0.0',
          description: 'First version',
          status: 'Published'
        }]
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...mockSchema, ...updates }),
      });

      await apiClient.updateSchema('schema-1', updates);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/schemas/schema-1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
    });
  });

  describe('Schema Versions API', () => {
    const mockVersion: SchemaVersion = {
      id: 'version-1',
      specification: 'command Test {}',
      semanticVersion: '1.0.0',
      description: 'First version',
      status: 'Draft',
      schemaId: 'schema-1',
      createdAt: '2023-01-01'
    };

    it('should get schema versions', async () => {
      const mockResponse = { versions: [mockVersion] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.getSchemaVersions();
      expect(result).toEqual(mockResponse);
    });

    it('should create schema version with all required fields', async () => {
      const versionData = {
        specification: 'command NewCommand {}',
        semanticVersion: '1.1.0',
        description: 'New version',
        status: 'Draft' as const,
        schemaId: 'schema-1'
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockVersion),
      });

      const result = await apiClient.createSchemaVersion(versionData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/schema-versions'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(versionData),
        })
      );
      expect(result).toEqual(mockVersion);
    });

    it('should update schema version', async () => {
      const updates = { description: 'Updated description', status: 'Published' as const };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...mockVersion, ...updates }),
      });

      await apiClient.updateSchemaVersion('version-1', updates);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/schema-versions/version-1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
    });
  });

  describe('Registry Statistics and Search', () => {
    it('should get registry stats', async () => {
      const mockStats = { stats: { products: 1, domains: 2, contexts: 3, schemas: 4, versions: 5 } };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStats),
      });

      const result = await apiClient.getRegistryStats();
      expect(result).toEqual(mockStats);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/registry'),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })
      );
    });

    it('should perform find with query encoding', async () => {
      const mockResults = { results: [{ type: 'schema', name: 'Test Schema' }] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResults),
      });

      const result = await apiClient.find('test query with spaces');
      expect(result).toEqual(mockResults);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/find?q=test%20query%20with%20spaces'),
        expect.any(Object)
      );
    });

    it('should encode special characters in find query', async () => {
      const mockResults = { results: [] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResults),
      });

      await apiClient.find('query+with&special=chars');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/find?q=query%2Bwith%26special%3Dchars'),
        expect.any(Object)
      );
    });
  });

  describe('Registry Statistics API', () => {
    it('should get registry statistics', async () => {
      const mockStats = {
        stats: {
          products: 5,
          domains: 12,
          contexts: 8,
          schemas: 25,
          versions: 45
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStats),
      });

      const result = await apiClient.getRegistryStats();
      expect(result).toEqual(mockStats);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/registry'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        })
      );
    });

    it('should handle empty registry statistics', async () => {
      const emptyStats = {
        stats: {
          products: 0,
          domains: 0,
          contexts: 0,
          schemas: 0,
          versions: 0
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(emptyStats),
      });

      const result = await apiClient.getRegistryStats();
      expect(result).toEqual(emptyStats);
    });
  });

  describe('Debug Query API', () => {
    it('should execute debug query successfully', async () => {
      const debugResponse = {
        query: 'test query',
        results: [{ id: 'item-1', name: 'Test Item' }],
        count: 1,
        timestamp: '2023-01-01T10:00:00Z'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(debugResponse),
      });

      const result = await apiClient.debugQuery('test query');
      expect(result).toEqual(debugResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/debug-db'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ query: 'test query' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        })
      );
    });

    it('should handle debug query with error', async () => {
      const errorResponse = {
        query: 'invalid query',
        results: [],
        count: 0,
        timestamp: '2023-01-01T10:00:00Z',
        error: 'Invalid query syntax'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(errorResponse),
      });

      const result = await apiClient.debugQuery('invalid query');
      expect(result).toEqual(errorResponse);
      expect(result.error).toBe('Invalid query syntax');
    });

    it('should encode special characters in debug query', async () => {
      const mockResponse = {
        query: 'query+with&special=chars',
        results: [],
        count: 0,
        timestamp: '2023-01-01T10:00:00Z'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await apiClient.debugQuery('query+with&special=chars');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/debug-db'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ query: 'query+with&special=chars' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        })
      );
    });
  });

  describe('Subscription API', () => {
    it('should subscribe to product', async () => {
      const subscriptionResponse = {
        message: 'Successfully subscribed',
        subscriptionId: 'sub-123'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(subscriptionResponse),
      });

      const result = await apiClient.subscribe('product-1', 'P');
      expect(result).toEqual(subscriptionResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ typeId: 'product-1', type: 'P' }),
        })
      );
    });

    it('should subscribe to domain', async () => {
      const subscriptionResponse = {
        message: 'Successfully subscribed',
        subscriptionId: 'sub-456'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(subscriptionResponse),
      });

      const result = await apiClient.subscribe('domain-1', 'D');
      expect(result).toEqual(subscriptionResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ typeId: 'domain-1', type: 'D' }),
        })
      );
    });

    it('should subscribe to context', async () => {
      const subscriptionResponse = {
        message: 'Successfully subscribed',
        subscriptionId: 'sub-789'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(subscriptionResponse),
      });

      const result = await apiClient.subscribe('context-1', 'C');
      expect(result).toEqual(subscriptionResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ typeId: 'context-1', type: 'C' }),
        })
      );
    });

    it('should unsubscribe from product', async () => {
      const unsubscribeResponse = {
        message: 'Successfully unsubscribed'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(unsubscribeResponse),
      });

      const result = await apiClient.unsubscribe('product-1', 'P');
      expect(result).toEqual(unsubscribeResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions?typeId=product-1&type=P'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should unsubscribe from domain', async () => {
      const unsubscribeResponse = {
        message: 'Successfully unsubscribed'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(unsubscribeResponse),
      });

      const result = await apiClient.unsubscribe('domain-1', 'D');
      expect(result).toEqual(unsubscribeResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions?typeId=domain-1&type=D'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should unsubscribe from context', async () => {
      const unsubscribeResponse = {
        message: 'Successfully unsubscribed'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(unsubscribeResponse),
      });

      const result = await apiClient.unsubscribe('context-1', 'C');
      expect(result).toEqual(unsubscribeResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions?typeId=context-1&type=C'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should check if subscribed to product', async () => {
      const statusResponse = { isSubscribed: true };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(statusResponse),
      });

      const result = await apiClient.isSubscribed('product-1', 'P');
      expect(result).toEqual(statusResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions?typeId=product-1&type=P'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        })
      );
    });

    it('should check if not subscribed to domain', async () => {
      const statusResponse = { isSubscribed: false };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(statusResponse),
      });

      const result = await apiClient.isSubscribed('domain-1', 'D');
      expect(result).toEqual(statusResponse);
    });

    it('should get all subscriptions', async () => {
      const subscriptionsResponse = {
        subscriptions: [
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
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(subscriptionsResponse),
      });

      const result = await apiClient.getSubscriptions();
      expect(result).toEqual(subscriptionsResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        })
      );
    });

    it('should handle empty subscriptions list', async () => {
      const emptyResponse = { subscriptions: [] };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(emptyResponse),
      });

      const result = await apiClient.getSubscriptions();
      expect(result).toEqual(emptyResponse);
    });
  });

  describe('Change Notifications API', () => {
    it('should get changes summary', async () => {
      const summaryResponse = {
        products: { new: 2, updated: 1, deleted: 0 },
        domains: { new: 1, updated: 0, deleted: 1 },
        contexts: { new: 0, updated: 2, deleted: 0 },
        schemas: { new: 3, updated: 1, deleted: 0 },
        schema_versions: { new: 1, updated: 0, deleted: 0 },
        totalChanges: 8
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(summaryResponse),
      });

      const result = await apiClient.getChangesSummary();
      expect(result).toEqual(summaryResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/changes/summary'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        })
      );
    });

    it('should handle empty changes summary', async () => {
      const emptyResponse = {
        products: { new: 0, updated: 0, deleted: 0 },
        domains: { new: 0, updated: 0, deleted: 0 },
        contexts: { new: 0, updated: 0, deleted: 0 },
        schemas: { new: 0, updated: 0, deleted: 0 },
        schema_versions: { new: 0, updated: 0, deleted: 0 },
        totalChanges: 0
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(emptyResponse),
      });

      const result = await apiClient.getChangesSummary();
      expect(result).toEqual(emptyResponse);
    });

    it('should get detailed changes for product', async () => {
      const detailedChanges = [
        {
          id: 'change-1',
          entityType: 'product',
          entityId: 'product-1',
          entityName: 'Test Product',
          changeType: 'created',
          changeData: { name: 'Test Product' },
          createdAt: '2023-01-01T10:00:00Z',
          changedByUserName: 'John Doe'
        },
        {
          id: 'change-2',
          entityType: 'product',
          entityId: 'product-2',
          entityName: 'Another Product',
          changeType: 'updated',
          changeData: { description: 'Updated description' },
          createdAt: '2023-01-01T11:00:00Z',
          changedByUserName: 'Jane Smith'
        }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(detailedChanges),
      });

      const result = await apiClient.getDetailedChanges('product');
      expect(result).toEqual(detailedChanges);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/changes/detailed?entityType=product'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        })
      );
    });

    it('should get detailed changes for schema', async () => {
      const detailedChanges = [
        {
          id: 'change-3',
          entityType: 'schema',
          entityId: 'schema-1',
          entityName: 'UserEvent',
          changeType: 'updated',
          changeData: { version: '2.0.0' },
          createdAt: '2023-01-01T12:00:00Z',
          isBreakingChange: true
        }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(detailedChanges),
      });

      const result = await apiClient.getDetailedChanges('schema');
      expect(result).toEqual(detailedChanges);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/changes/detailed?entityType=schema'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        })
      );
    });

    it('should handle empty detailed changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await apiClient.getDetailedChanges('domain');
      expect(result).toEqual([]);
    });

    it('should mark changes as seen', async () => {
      const successResponse = { success: true };
      const changeIds = ['change-1', 'change-2', 'change-3'];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(successResponse),
      });

      const result = await apiClient.markChangesAsSeen(changeIds);
      expect(result).toEqual(successResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/changes/mark-seen'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ changeIds }),
        })
      );
    });

    it('should handle empty change IDs when marking as seen', async () => {
      const successResponse = { success: true };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(successResponse),
      });

      const result = await apiClient.markChangesAsSeen([]);
      expect(result).toEqual(successResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/changes/mark-seen'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ changeIds: [] }),
        })
      );
    });
  });

  describe('User Notification Preferences API', () => {
    it('should get user notification preferences', async () => {
      const preferencesResponse = {
        emailNotifications: true,
        realTimeNotifications: false,
        digestFrequency: 'daily',
        notificationTypes: {
          productChanges: true,
          domainChanges: false,
          schemaChanges: true,
          versionChanges: true
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(preferencesResponse),
      });

      const result = await apiClient.getUserNotificationPreferences();
      expect(result).toEqual(preferencesResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/user/notification-preferences'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        })
      );
    });

    it('should handle default notification preferences', async () => {
      const defaultPreferences = {
        emailNotifications: false,
        realTimeNotifications: false,
        digestFrequency: 'never',
        notificationTypes: {
          productChanges: false,
          domainChanges: false,
          schemaChanges: false,
          versionChanges: false
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(defaultPreferences),
      });

      const result = await apiClient.getUserNotificationPreferences();
      expect(result).toEqual(defaultPreferences);
    });

    it('should update user notification preferences', async () => {
      const preferences = {
        emailNotifications: true,
        realTimeNotifications: true,
        digestFrequency: 'weekly',
        notificationTypes: {
          productChanges: true,
          domainChanges: true,
          schemaChanges: false,
          versionChanges: true
        }
      };

      const updateResponse = {
        message: 'Preferences updated successfully',
        preferences
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updateResponse),
      });

      const result = await apiClient.updateUserNotificationPreferences(preferences);
      expect(result).toEqual(updateResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/user/notification-preferences'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(preferences),
        })
      );
    });

    it('should update partial notification preferences', async () => {
      const partialPreferences = {
        emailNotifications: false,
        digestFrequency: 'daily'
      };

      const updateResponse = {
        message: 'Preferences updated successfully',
        preferences: partialPreferences
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(updateResponse),
      });

      const result = await apiClient.updateUserNotificationPreferences(partialPreferences);
      expect(result).toEqual(updateResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/user/notification-preferences'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(partialPreferences),
        })
      );
    });
  });

  describe('Tenant Configuration', () => {
    it('should return correct tenant info', () => {
      const tenantInfo = apiClient.getTenantInfo();
      expect(tenantInfo).toEqual({
        tenantId: 'default-tenant',
        registryId: 'default-registry',
        baseUrl: 'http://localhost:8789'
      });
    });
  });
});