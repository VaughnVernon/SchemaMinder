import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSchemaRegistry } from '../../src/hooks/useSchemaRegistry';
import { apiClient } from '../../src/services/apiClient';
import type { Product, Domain, Context, Schema, SchemaVersion, SchemaScope, SchemaStatus } from '../../src/types/schema';

// Mock the apiClient
vi.mock('../../src/services/apiClient', () => ({
  apiClient: {
    getProducts: vi.fn(),
    createProduct: vi.fn(),
    createDomain: vi.fn(),
    createContext: vi.fn(),
    createSchema: vi.fn(),
    createSchemaVersion: vi.fn(),
    updateProduct: vi.fn(),
    updateDomain: vi.fn(),
    updateContext: vi.fn(),
    updateSchema: vi.fn(),
    updateSchemaVersion: vi.fn(),
    getTenantInfo: vi.fn(() => ({ tenantId: 'test-tenant', baseUrl: 'http://test.api' }))
  }
}));

// Mock console.error to avoid noise in tests
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('useSchemaRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleError.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Loading', () => {
    it('should start with loading state and load registry data on mount', async () => {
      const mockProducts: Product[] = [
        {
          id: 'product1',
          name: 'Test Product',
          description: 'A test product',
          domains: [],
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01')
        }
      ];

      (apiClient.getProducts as any).mockResolvedValue({ products: mockProducts });

      const { result } = renderHook(() => useSchemaRegistry());

      // Initial state
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.registry.products).toEqual([]);

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.registry.products).toEqual(mockProducts);
      expect(result.current.error).toBe(null);
      expect(apiClient.getProducts).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors during initial load', async () => {
      const mockError = new Error('Network error');
      (apiClient.getProducts as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.registry.products).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to load registry:', mockError);
    });

    it('should handle non-Error exceptions during initial load', async () => {
      (apiClient.getProducts as any).mockRejectedValue('String error');

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load registry');
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to load registry:', 'String error');
    });
  });

  describe('Product Operations', () => {
    beforeEach(() => {
      (apiClient.getProducts as any).mockResolvedValue({ products: [] });
    });

    it('should add a new product successfully', async () => {
      const newProduct = { id: 'new-product', name: 'New Product', description: 'New product desc' };
      (apiClient.createProduct as any).mockResolvedValue(newProduct);

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let productId: string;
      await act(async () => {
        productId = await result.current.addProduct('New Product', 'New product desc');
      });

      expect(productId!).toBe('new-product');
      expect(apiClient.createProduct).toHaveBeenCalledWith({
        name: 'New Product',
        description: 'New product desc'
      });
      expect(apiClient.getProducts).toHaveBeenCalledTimes(2); // Initial + reload
    });

    it('should handle product creation errors', async () => {
      const mockError = new Error('Creation failed');
      (apiClient.createProduct as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.addProduct('New Product')).rejects.toThrow('Creation failed');
      });

      expect(result.current.error).toBe('Creation failed');
    });

    it('should update a product successfully', async () => {
      (apiClient.updateProduct as any).mockResolvedValue({});

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProduct('product1', { name: 'Updated Product' });
      });

      expect(apiClient.updateProduct).toHaveBeenCalledWith('product1', { name: 'Updated Product' });
      expect(apiClient.getProducts).toHaveBeenCalledTimes(2); // Initial + reload
    });

    it('should handle product update errors', async () => {
      const mockError = new Error('Update failed');
      (apiClient.updateProduct as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.updateProduct('product1', { name: 'Updated' })).rejects.toThrow('Update failed');
      });

      expect(result.current.error).toBe('Update failed');
    });
  });

  describe('Domain Operations', () => {
    beforeEach(() => {
      (apiClient.getProducts as any).mockResolvedValue({ products: [] });
    });

    it('should add a new domain successfully', async () => {
      const newDomain = { id: 'new-domain', name: 'New Domain' };
      (apiClient.createDomain as any).mockResolvedValue(newDomain);

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let domainId: string;
      await act(async () => {
        domainId = await result.current.addDomain('product1', 'New Domain', 'Domain desc');
      });

      expect(domainId!).toBe('new-domain');
      expect(apiClient.createDomain).toHaveBeenCalledWith({
        name: 'New Domain',
        description: 'Domain desc',
        productId: 'product1'
      });
    });

    it('should handle domain creation errors', async () => {
      const mockError = new Error('Domain creation failed');
      (apiClient.createDomain as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.addDomain('product1', 'New Domain')).rejects.toThrow('Domain creation failed');
      });

      expect(result.current.error).toBe('Domain creation failed');
    });

    it('should update a domain successfully', async () => {
      (apiClient.updateDomain as any).mockResolvedValue({});

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateDomain('domain1', { name: 'Updated Domain' });
      });

      expect(apiClient.updateDomain).toHaveBeenCalledWith('domain1', { name: 'Updated Domain' });
    });
  });

  describe('Context Operations', () => {
    beforeEach(() => {
      (apiClient.getProducts as any).mockResolvedValue({ products: [] });
    });

    it('should add a new context successfully', async () => {
      const newContext = { id: 'new-context', name: 'New Context' };
      (apiClient.createContext as any).mockResolvedValue(newContext);

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let contextId: string;
      await act(async () => {
        contextId = await result.current.addContext('domain1', 'New Context', 'test-namespace', 'Context desc');
      });

      expect(contextId!).toBe('new-context');
      expect(apiClient.createContext).toHaveBeenCalledWith({
        name: 'New Context',
        namespace: 'test-namespace',
        description: 'Context desc',
        domainId: 'domain1'
      });
    });

    it('should handle context creation errors', async () => {
      const mockError = new Error('Context creation failed');
      (apiClient.createContext as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.addContext('domain1', 'New Context', 'test-namespace')).rejects.toThrow('Context creation failed');
      });

      expect(result.current.error).toBe('Context creation failed');
    });

    it('should update a context successfully', async () => {
      (apiClient.updateContext as any).mockResolvedValue({});

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateContext('context1', { description: 'Updated description' });
      });

      expect(apiClient.updateContext).toHaveBeenCalledWith('context1', { description: 'Updated description' });
    });
  });

  describe('Schema Operations', () => {
    beforeEach(() => {
      (apiClient.getProducts as any).mockResolvedValue({ products: [] });
    });

    it('should add a new schema without initial version', async () => {
      const newSchema = { id: 'new-schema', name: 'New Schema' };
      (apiClient.createSchema as any).mockResolvedValue(newSchema);

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const schemaData: Omit<Schema, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'New Schema',
        description: 'Schema description',
        schemaTypeCategory: 'command',
        scope: 'public' as SchemaScope,
        versions: []
      };

      let schemaId: string;
      await act(async () => {
        schemaId = await result.current.addSchema('context1', schemaData);
      });

      expect(schemaId!).toBe('new-schema');
      expect(apiClient.createSchema).toHaveBeenCalledWith({
        name: 'New Schema',
        description: 'Schema description',
        schemaTypeCategory: 'command',
        scope: 'public',
        contextId: 'context1'
      });
      expect(apiClient.createSchemaVersion).not.toHaveBeenCalled();
    });

    it('should add a new schema with initial version', async () => {
      const newSchema = { id: 'new-schema', name: 'New Schema' };
      const newVersion = { id: 'version1' };
      (apiClient.createSchema as any).mockResolvedValue(newSchema);
      (apiClient.createSchemaVersion as any).mockResolvedValue(newVersion);

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const schemaData: Omit<Schema, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'New Schema',
        description: 'Schema description',
        schemaTypeCategory: 'event',
        scope: 'private' as SchemaScope,
        versions: [{
          id: 'temp-id',
          specification: 'event TestEvent { string name }',
          semanticVersion: '1.0.0',
          description: 'Initial version',
          status: 'draft' as SchemaStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      };

      let schemaId: string;
      await act(async () => {
        schemaId = await result.current.addSchema('context1', schemaData);
      });

      expect(schemaId!).toBe('new-schema');
      expect(apiClient.createSchema).toHaveBeenCalled();
      expect(apiClient.createSchemaVersion).toHaveBeenCalledWith({
        specification: 'event TestEvent { string name }',
        semanticVersion: '1.0.0',
        description: 'Initial version',
        status: 'draft',
        schemaId: 'new-schema'
      });
    });

    it('should handle schema creation errors', async () => {
      const mockError = new Error('Schema creation failed');
      (apiClient.createSchema as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const schemaData: Omit<Schema, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'New Schema',
        description: null,
        schemaTypeCategory: 'command',
        scope: 'public' as SchemaScope,
        versions: []
      };

      await act(async () => {
        await expect(result.current.addSchema('context1', schemaData)).rejects.toThrow('Schema creation failed');
      });

      expect(result.current.error).toBe('Schema creation failed');
    });

    it('should update a schema successfully', async () => {
      (apiClient.updateSchema as any).mockResolvedValue({});

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updates = {
        name: 'Updated Schema',
        schemaTypeCategory: 'data',
        scope: 'private' as SchemaScope
      };

      await act(async () => {
        await result.current.updateSchema('schema1', updates);
      });

      expect(apiClient.updateSchema).toHaveBeenCalledWith('schema1', updates);
    });
  });

  describe('Schema Version Operations', () => {
    beforeEach(() => {
      (apiClient.getProducts as any).mockResolvedValue({ products: [] });
    });

    it('should add a new schema version successfully', async () => {
      const newVersion = { id: 'new-version' };
      (apiClient.createSchemaVersion as any).mockResolvedValue(newVersion);

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const versionData: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'> = {
        specification: 'command UpdatedCommand { string name; int version }',
        semanticVersion: '1.1.0',
        description: 'Added version field',
        status: 'published' as SchemaStatus
      };

      let versionId: string;
      await act(async () => {
        versionId = await result.current.addSchemaVersion('schema1', versionData);
      });

      expect(versionId!).toBe('new-version');
      expect(apiClient.createSchemaVersion).toHaveBeenCalledWith({
        specification: 'command UpdatedCommand { string name; int version }',
        semanticVersion: '1.1.0',
        description: 'Added version field',
        status: 'published',
        schemaId: 'schema1'
      });
    });

    it('should handle schema version creation errors', async () => {
      const mockError = new Error('Version creation failed');
      (apiClient.createSchemaVersion as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const versionData: Omit<SchemaVersion, 'id' | 'createdAt' | 'updatedAt'> = {
        specification: 'invalid specification',
        semanticVersion: '1.0.0',
        description: null,
        status: 'draft' as SchemaStatus
      };

      await act(async () => {
        await expect(result.current.addSchemaVersion('schema1', versionData)).rejects.toThrow('Version creation failed');
      });

      expect(result.current.error).toBe('Version creation failed');
    });

    it('should update a schema version successfully', async () => {
      (apiClient.updateSchemaVersion as any).mockResolvedValue({});

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateSchemaVersion('schema1', 'version1', {
          description: 'Updated description',
          status: 'published' as SchemaStatus
        });
      });

      expect(apiClient.updateSchemaVersion).toHaveBeenCalledWith('version1', {
        description: 'Updated description',
        status: 'published'
      });
    });

    it('should handle schema version update errors', async () => {
      const mockError = new Error('Version update failed');
      (apiClient.updateSchemaVersion as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.updateSchemaVersion('schema1', 'version1', { status: 'published' as SchemaStatus }))
          .rejects.toThrow('Version update failed');
      });

      expect(result.current.error).toBe('Version update failed');
    });
  });

  describe('Helper Functions', () => {
    const mockRegistry = {
      products: [
        {
          id: 'product1',
          name: 'Product 1',
          domains: [
            {
              id: 'domain1',
              name: 'Domain 1',
              contexts: [
                {
                  id: 'context1',
                  name: 'Context 1',
                  schemas: [
                    {
                      id: 'schema1',
                      name: 'Schema 1',
                      versions: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    beforeEach(() => {
      (apiClient.getProducts as any).mockResolvedValue(mockRegistry);
    });

    it('should find schema by id', async () => {
      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const schema = result.current.findSchema('schema1');
      expect(schema).toBeDefined();
      expect(schema?.name).toBe('Schema 1');
    });

    it('should return undefined for non-existent schema', async () => {
      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const schema = result.current.findSchema('non-existent');
      expect(schema).toBeUndefined();
    });

    it('should find context by id', async () => {
      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const context = result.current.findContext('context1');
      expect(context).toBeDefined();
      expect(context?.name).toBe('Context 1');
    });

    it('should return undefined for non-existent context', async () => {
      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const context = result.current.findContext('non-existent');
      expect(context).toBeUndefined();
    });
  });

  describe('Error Management', () => {
    beforeEach(() => {
      (apiClient.getProducts as any).mockResolvedValue({ products: [] });
    });

    it('should clear error state', async () => {
      const mockError = new Error('Test error');
      (apiClient.createProduct as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Cause an error
      await act(async () => {
        await expect(result.current.addProduct('Test')).rejects.toThrow();
      });

      expect(result.current.error).toBe('Test error');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Reload Functionality', () => {
    it('should reload registry data manually', async () => {
      const initialProducts = [{ id: '1', name: 'Initial', domains: [] }];
      const updatedProducts = [{ id: '1', name: 'Updated', domains: [] }];

      (apiClient.getProducts as any)
        .mockResolvedValueOnce({ products: initialProducts })
        .mockResolvedValueOnce({ products: updatedProducts });

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.registry.products[0].name).toBe('Initial');

      await act(async () => {
        await result.current.reload();
      });

      expect(result.current.registry.products[0].name).toBe('Updated');
      expect(apiClient.getProducts).toHaveBeenCalledTimes(2);
    });
  });

  describe('Tenant Info', () => {
    it('should provide tenant info from apiClient', () => {
      const { result } = renderHook(() => useSchemaRegistry());

      expect(result.current.tenantInfo).toEqual({
        tenantId: 'test-tenant',
        baseUrl: 'http://test.api'
      });
      expect(apiClient.getTenantInfo).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should handle multiple concurrent operations', async () => {
      (apiClient.getProducts as any).mockResolvedValue({ products: [] });
      (apiClient.createProduct as any).mockImplementation((data) =>
        Promise.resolve({ id: `id-${data.name}`, ...data })
      );

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Start multiple operations concurrently
      const operations = [
        result.current.addProduct('Product 1'),
        result.current.addProduct('Product 2'),
        result.current.addProduct('Product 3')
      ];

      const results = await act(async () => {
        return Promise.all(operations);
      });

      expect(results).toEqual(['id-Product 1', 'id-Product 2', 'id-Product 3']);
      expect(apiClient.createProduct).toHaveBeenCalledTimes(3);
      // Each operation triggers a reload, plus initial load
      expect(apiClient.getProducts).toHaveBeenCalledTimes(4);
    });

    it('should maintain error state across operations', async () => {
      (apiClient.getProducts as any).mockResolvedValue({ products: [] });
      (apiClient.createProduct as any)
        .mockResolvedValueOnce({ id: 'success' })
        .mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useSchemaRegistry());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Successful operation
      await act(async () => {
        await result.current.addProduct('Success');
      });
      expect(result.current.error).toBe(null);

      // Failed operation
      await act(async () => {
        await expect(result.current.addProduct('Fail')).rejects.toThrow('Failed');
      });
      expect(result.current.error).toBe('Failed');
    });
  });
});