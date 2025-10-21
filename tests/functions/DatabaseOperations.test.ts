import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabaseOperations } from '../../functions/persistence/operations';

// Mock SqlStorage
const mockSqlStorage = {
  exec: vi.fn(),
};

describe('DatabaseOperations', () => {
  let operations: DatabaseOperations;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSqlStorage.exec.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });
    operations = new DatabaseOperations(mockSqlStorage as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Product Operations', () => {
    describe('getAllProducts', () => {
      it('should fetch all products with hierarchy', async () => {
        const mockResults = [
          {
            id: 'product1',
            name: 'Product 1',
            description: 'Product 1 description',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            domain_id: 'domain1',
            domain_name: 'Domain 1',
            domain_description: 'Domain 1 description',
            context_id: 'context1',
            context_name: 'Context 1',
            context_description: 'Context 1 description',
            schema_id: 'schema1',
            schema_name: 'Schema 1',
            schema_description: 'Schema 1 description',
            schema_type_category: 'command',
            schema_scope: 'public',
            version_id: 'version1',
            specification: 'command TestCommand { string name }',
            semantic_version: '1.0.0',
            version_description: 'Initial version',
            version_status: 'published',
            version_created_at: '2023-01-01T00:00:00Z',
            version_updated_at: '2023-01-01T00:00:00Z'
          }
        ];

        mockSqlStorage.exec.mockReturnValue({ toArray: vi.fn().mockResolvedValue(mockResults) });

        const result = await operations.getAllProducts();

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          id: 'product1',
          name: 'Product 1',
          description: 'Product 1 description',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          domains: [{
            id: 'domain1',
            name: 'Domain 1',
            description: 'Domain 1 description',
            productId: 'product1',
            contexts: [{
              id: 'context1',
              name: 'Context 1',
              description: 'Context 1 description',
              domainId: 'domain1',
              schemas: [{
                id: 'schema1',
                name: 'Schema 1',
                description: 'Schema 1 description',
                schemaTypeCategory: 'command',
                scope: 'public',
                contextId: 'context1',
                versions: [{
                  id: 'version1',
                  specification: 'command TestCommand { string name }',
                  semanticVersion: '1.0.0',
                  description: 'Initial version',
                  status: 'published',
                  schemaId: 'schema1',
                  createdAt: '2023-01-01T00:00:00Z',
                  updatedAt: '2023-01-01T00:00:00Z'
                }]
              }]
            }]
          }]
        });

        expect(mockSqlStorage.exec).toHaveBeenCalledWith(expect.stringContaining('SELECT p.*'));
      });

      it('should handle products without domains', async () => {
        const mockResults = [
          {
            id: 'product1',
            name: 'Product 1',
            description: 'Product 1 description',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            domain_id: null,
            domain_name: null,
            domain_description: null
          }
        ];

        mockSqlStorage.exec.mockReturnValue({ toArray: vi.fn().mockResolvedValue(mockResults) });

        const result = await operations.getAllProducts();

        expect(result).toHaveLength(1);
        expect(result[0].domains).toEqual([]);
      });
    });

    describe('getProductById', () => {
      it('should fetch product by ID', async () => {
        const mockResults = [
          {
            id: 'product1',
            name: 'Product 1',
            description: null,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            domain_id: null
          }
        ];

        mockSqlStorage.exec.mockReturnValue({ toArray: vi.fn().mockResolvedValue(mockResults) });

        const result = await operations.getProductById('product1');

        expect(result).toEqual({
          id: 'product1',
          name: 'Product 1',
          description: null,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          domains: []
        });

        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('WHERE p.id = ?'),
          'product1'
        );
      });

      it('should return null for non-existent product', async () => {
        mockSqlStorage.exec.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });

        const result = await operations.getProductById('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('createProduct', () => {
      it('should create a new product', async () => {
        await operations.createProduct('product1', 'New Product', 'Description');

        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO products'),
          'product1',
          'New Product',
          'Description',
          expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
          expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
        );
      });

      it('should create product with null description', async () => {
        await operations.createProduct('product1', 'New Product', null);

        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO products'),
          'product1',
          'New Product',
          null,
          expect.any(String),
          expect.any(String)
        );
      });
    });

    describe('updateProduct', () => {
      it('should update an existing product', async () => {
        await operations.updateProduct('product1', 'Updated Product', 'Updated description');

        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE products SET name = ?, description = ?, updated_at = ? WHERE id = ?'),
          'Updated Product',
          'Updated description',
          expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
          'product1'
        );
      });
    });

    describe('deleteProduct', () => {
      it('should delete a product', async () => {
        await operations.deleteProduct('product1');

        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          'DELETE FROM products WHERE id = ?',
          'product1'
        );
      });
    });
  });

  describe('Domain Operations', () => {
    describe('getAllDomains', () => {
      it('should fetch all domains with product information', async () => {
        const mockResults = [
          {
            id: 'domain1',
            name: 'Domain 1',
            description: 'Domain description',
            product_id: 'product1',
            product_name: 'Product 1',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }
        ];

        mockSqlStorage.exec.mockReturnValue({ toArray: vi.fn().mockResolvedValue(mockResults) });

        const result = await operations.getAllDomains();

        expect(result).toEqual(mockResults);
        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('SELECT d.*, p.name as product_name')
        );
      });
    });

    describe('createDomain', () => {
      it('should create a new domain', async () => {
        await operations.createDomain('domain1', 'New Domain', 'Description', 'product1');

        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO domains'),
          'domain1',
          'New Domain',
          'Description',
          'product1',
          expect.any(String),
          expect.any(String)
        );
      });
    });
  });

  describe('Context Operations', () => {
    describe('createContext', () => {
      it('should create a new context', async () => {
        await operations.createContext('context1', 'New Context', 'test-namespace', 'Description', 'domain1');

        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO contexts'),
          'context1',
          'New Context',
          'test-namespace',
          'Description',
          'domain1',
          expect.any(String),
          expect.any(String)
        );
      });
    });
  });

  describe('Schema Operations', () => {
    describe('createSchema', () => {
      it('should create a new schema', async () => {
        await operations.createSchema(
          'schema1', 
          'New Schema', 
          'Schema description', 
          'command', 
          'public', 
          'context1'
        );

        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO schemas'),
          'schema1',
          'New Schema',
          'Schema description',
          'command',
          'public',
          'context1',
          expect.any(String),
          expect.any(String)
        );
      });
    });

    describe('updateSchemaWithVersionSpecifications', () => {
      it('should update schema and version specifications atomically', async () => {
        const versionUpdates = [
          {
            versionId: 'version1',
            specification: 'command UpdatedSchema { string field }',
            semanticVersion: '1.1.0',
            description: 'Updated version',
            status: 'published'
          }
        ];

        await operations.updateSchemaWithVersionSpecifications(
          'schema1',
          'Updated Schema',
          'Updated description',
          'event',
          'private',
          versionUpdates
        );

        expect(mockSqlStorage.exec).toHaveBeenCalledTimes(2);
        
        // First call should update the schema
        expect(mockSqlStorage.exec).toHaveBeenNthCalledWith(1,
          expect.stringContaining('UPDATE schemas SET'),
          'Updated Schema',
          'Updated description',
          'event',
          'private',
          expect.any(String),
          'schema1'
        );

        // Second call should update the version
        expect(mockSqlStorage.exec).toHaveBeenNthCalledWith(2,
          expect.stringContaining('UPDATE schema_versions SET'),
          'command UpdatedSchema { string field }',
          '1.1.0',
          'Updated version',
          'published',
          expect.any(String),
          'version1'
        );
      });

      it('should update schema without version updates', async () => {
        await operations.updateSchemaWithVersionSpecifications(
          'schema1',
          'Updated Schema',
          'Updated description',
          'data',
          'public'
        );

        expect(mockSqlStorage.exec).toHaveBeenCalledTimes(1);
        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE schemas SET'),
          'Updated Schema',
          'Updated description',
          'data',
          'public',
          expect.any(String),
          'schema1'
        );
      });
    });
  });

  describe('Schema Version Operations', () => {
    describe('createSchemaVersion', () => {
      it('should create a new schema version', async () => {
        await operations.createSchemaVersion(
          'version1',
          'command TestCommand { string name }',
          '1.0.0',
          'Initial version',
          'draft',
          'schema1'
        );

        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO schema_versions'),
          'version1',
          'command TestCommand { string name }',
          '1.0.0',
          'Initial version',
          'draft',
          'schema1',
          expect.any(String),
          expect.any(String)
        );
      });
    });

    describe('updateMultipleSchemaVersions', () => {
      it('should update multiple schema versions', async () => {
        const updates = [
          {
            versionId: 'version1',
            specification: 'command UpdatedCommand1 { string name }',
            semanticVersion: '1.1.0',
            description: 'Updated version 1',
            status: 'published'
          },
          {
            versionId: 'version2',
            specification: 'command UpdatedCommand2 { string name }',
            semanticVersion: '1.2.0',
            description: 'Updated version 2',
            status: 'draft'
          }
        ];

        await operations.updateMultipleSchemaVersions(updates);

        expect(mockSqlStorage.exec).toHaveBeenCalledTimes(2);
        
        expect(mockSqlStorage.exec).toHaveBeenNthCalledWith(1,
          expect.stringContaining('UPDATE schema_versions'),
          'command UpdatedCommand1 { string name }',
          '1.1.0',
          'Updated version 1',
          'published',
          expect.any(String),
          'version1'
        );

        expect(mockSqlStorage.exec).toHaveBeenNthCalledWith(2,
          expect.stringContaining('UPDATE schema_versions'),
          'command UpdatedCommand2 { string name }',
          '1.2.0',
          'Updated version 2',
          'draft',
          expect.any(String),
          'version2'
        );
      });

      it('should handle empty updates array', async () => {
        await operations.updateMultipleSchemaVersions([]);

        expect(mockSqlStorage.exec).not.toHaveBeenCalled();
      });
    });
  });

  describe('Registry Statistics', () => {
    describe('getRegistryStatistics', () => {
      it('should fetch registry statistics', async () => {
        const mockCounts = [{ count: 5 }];
        mockSqlStorage.exec.mockReturnValue({ toArray: vi.fn().mockResolvedValue(mockCounts) });

        const result = await operations.getRegistryStatistics();

        expect(result).toEqual({
          products: 5,
          domains: 5,
          contexts: 5,
          schemas: 5,
          versions: 5
        });

        expect(mockSqlStorage.exec).toHaveBeenCalledTimes(5);
        expect(mockSqlStorage.exec).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM products');
        expect(mockSqlStorage.exec).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM domains');
        expect(mockSqlStorage.exec).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM contexts');
        expect(mockSqlStorage.exec).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM schemas');
        expect(mockSqlStorage.exec).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM schema_versions');
      });

      it('should handle missing count results', async () => {
        mockSqlStorage.exec.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });

        const result = await operations.getRegistryStatistics();

        expect(result).toEqual({
          products: 0,
          domains: 0,
          contexts: 0,
          schemas: 0,
          versions: 0
        });
      });
    });
  });

  describe('Find Operations', () => {
    describe('find', () => {
      it('should search across all entity types', async () => {
        const mockResults = [
          {
            type: 'product',
            entity_id: 'product1',
            name: 'Test Product',
            description: 'Product description',
            product_id: 'product1',
            product_name: 'Test Product'
          },
          {
            type: 'schema',
            entity_id: 'schema1',
            name: 'TestSchema',
            description: 'Schema description',
            product_id: 'product1',
            domain_id: 'domain1',
            context_id: 'context1',
            schema_id: 'schema1',
            product_name: 'Product 1',
            domain_name: 'Domain 1',
            context_name: 'Context 1',
            schema_name: 'TestSchema'
          }
        ];

        mockSqlStorage.exec.mockReturnValue({ toArray: vi.fn().mockResolvedValue(mockResults) });

        const result = await operations.find('test');

        expect(result).toEqual(mockResults);
        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('SELECT'),
          '%test%',
          '%test%',
          '%test%', 
          '%test%',
          '%test%',
          '%test%',
          '%test%',
          '%test%',
          '%test%',
          '%test%',
          '%test%'
        );
      });

      it('should handle case insensitive search', async () => {
        await operations.find('TEST');

        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('LOWER'),
          '%test%',
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String)
        );
      });

      it('should limit results to 50', async () => {
        await operations.find('query');

        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT 50'),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String)
        );
      });
    });
  });

  describe('Timestamp Generation', () => {
    it('should generate consistent timestamp format', async () => {
      await operations.createProduct('product1', 'Test Product', null);

      const call = mockSqlStorage.exec.mock.calls[0];
      const createdAt = call[4];
      const updatedAt = call[5];

      expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(createdAt).toBe(updatedAt);
    });
  });

  describe('Hierarchy Building', () => {
    it('should handle multiple versions for same schema', async () => {
      const mockResults = [
        {
          id: 'product1',
          name: 'Product 1',
          description: null,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          domain_id: 'domain1',
          domain_name: 'Domain 1',
          domain_description: null,
          context_id: 'context1',
          context_name: 'Context 1',
          context_description: null,
          schema_id: 'schema1',
          schema_name: 'Schema 1',
          schema_description: null,
          schema_type_category: 'command',
          schema_scope: 'public',
          version_id: 'version1',
          specification: 'command Test1 { string name }',
          semantic_version: '1.0.0',
          version_description: 'Version 1',
          version_status: 'published',
          version_created_at: '2023-01-01T00:00:00Z',
          version_updated_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 'product1',
          name: 'Product 1',
          description: null,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          domain_id: 'domain1',
          domain_name: 'Domain 1',
          domain_description: null,
          context_id: 'context1',
          context_name: 'Context 1',
          context_description: null,
          schema_id: 'schema1',
          schema_name: 'Schema 1',
          schema_description: null,
          schema_type_category: 'command',
          schema_scope: 'public',
          version_id: 'version2',
          specification: 'command Test2 { string name; int age }',
          semantic_version: '1.1.0',
          version_description: 'Version 2',
          version_status: 'draft',
          version_created_at: '2023-01-02T00:00:00Z',
          version_updated_at: '2023-01-02T00:00:00Z'
        }
      ];

      mockSqlStorage.exec.mockReturnValue({ toArray: vi.fn().mockResolvedValue(mockResults) });

      const result = await operations.getAllProducts();

      expect(result).toHaveLength(1);
      expect(result[0].domains[0].contexts[0].schemas[0].versions).toHaveLength(2);
      expect(result[0].domains[0].contexts[0].schemas[0].versions[0].semanticVersion).toBe('1.0.0');
      expect(result[0].domains[0].contexts[0].schemas[0].versions[1].semanticVersion).toBe('1.1.0');
    });

    it('should handle multiple schemas in same context', async () => {
      const mockResults = [
        {
          id: 'product1',
          name: 'Product 1',
          description: null,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          domain_id: 'domain1',
          domain_name: 'Domain 1',
          domain_description: null,
          context_id: 'context1',
          context_name: 'Context 1',
          context_description: null,
          schema_id: 'schema1',
          schema_name: 'Schema 1',
          schema_description: null,
          schema_type_category: 'command',
          schema_scope: 'public',
          version_id: 'version1',
          specification: 'command Test1 { }',
          semantic_version: '1.0.0',
          version_description: null,
          version_status: 'published',
          version_created_at: '2023-01-01T00:00:00Z',
          version_updated_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 'product1',
          name: 'Product 1',
          description: null,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          domain_id: 'domain1',
          domain_name: 'Domain 1',
          domain_description: null,
          context_id: 'context1',
          context_name: 'Context 1',
          context_description: null,
          schema_id: 'schema2',
          schema_name: 'Schema 2',
          schema_description: null,
          schema_type_category: 'event',
          schema_scope: 'private',
          version_id: 'version2',
          specification: 'event Test2 { }',
          semantic_version: '1.0.0',
          version_description: null,
          version_status: 'draft',
          version_created_at: '2023-01-01T00:00:00Z',
          version_updated_at: '2023-01-01T00:00:00Z'
        }
      ];

      mockSqlStorage.exec.mockReturnValue({ toArray: vi.fn().mockResolvedValue(mockResults) });

      const result = await operations.getAllProducts();

      expect(result).toHaveLength(1);
      expect(result[0].domains[0].contexts[0].schemas).toHaveLength(2);
      expect(result[0].domains[0].contexts[0].schemas[0].name).toBe('Schema 1');
      expect(result[0].domains[0].contexts[0].schemas[1].name).toBe('Schema 2');
    });
  });
});