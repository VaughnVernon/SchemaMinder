import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemaRegistryInstance } from '../../functions/SchemaRegistryInstance';

// Mock the DurableObjectState and related types
const mockSqlStorage = {
  exec: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
};

const mockDurableObjectState = {
  storage: {
    sql: mockSqlStorage,
    transaction: vi.fn().mockImplementation((callback) => callback()),
  },
};

const mockEnv = {
  SCHEMA_REGISTRY_INSTANCE: {},
  ASSETS: {},
};

// Mock the DatabaseMigrations and DatabaseOperations classes
vi.mock('../../functions/persistence/migrations', () => ({
  DatabaseMigrations: vi.fn().mockImplementation(() => ({
    needsInitialization: vi.fn().mockResolvedValue(false),
    initializeSchema: vi.fn().mockResolvedValue(undefined),
    initializeSampleData: vi.fn().mockResolvedValue(undefined),
    runMigrations: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../functions/persistence/operations', () => ({
  DatabaseOperations: vi.fn().mockImplementation(() => ({
    getAllProducts: vi.fn().mockResolvedValue([]),
    getProductById: vi.fn().mockResolvedValue(null),
    getProduct: vi.fn().mockResolvedValue({ id: '1', name: 'Test Product', description: 'Test' }),
    createProduct: vi.fn().mockResolvedValue(undefined),
    updateProduct: vi.fn().mockResolvedValue(undefined),
    deleteProduct: vi.fn().mockResolvedValue(undefined),
    getAllDomains: vi.fn().mockResolvedValue([]),
    getDomainById: vi.fn().mockResolvedValue(null),
    getDomain: vi.fn().mockResolvedValue({ id: '1', name: 'Test Domain', description: 'Test' }),
    createDomain: vi.fn().mockResolvedValue(undefined),
    updateDomain: vi.fn().mockResolvedValue(undefined),
    deleteDomain: vi.fn().mockResolvedValue(undefined),
    getAllContexts: vi.fn().mockResolvedValue([]),
    getContextById: vi.fn().mockResolvedValue(null),
    getContext: vi.fn().mockResolvedValue({ id: '1', name: 'Test Context', description: 'Test' }),
    createContext: vi.fn().mockResolvedValue(undefined),
    updateContext: vi.fn().mockResolvedValue(undefined),
    deleteContext: vi.fn().mockResolvedValue(undefined),
    getAllSchemas: vi.fn().mockResolvedValue([]),
    getSchemaById: vi.fn().mockResolvedValue(null),
    getSchema: vi.fn().mockResolvedValue({ id: '1', name: 'Test Schema', description: 'Test' }),
    createSchema: vi.fn().mockResolvedValue(undefined),
    updateSchema: vi.fn().mockResolvedValue(undefined),
    updateSchemaWithVersionSpecifications: vi.fn().mockResolvedValue(undefined),
    deleteSchema: vi.fn().mockResolvedValue(undefined),
    getAllSchemaVersions: vi.fn().mockResolvedValue([]),
    getSchemaVersionById: vi.fn().mockResolvedValue(null),
    createSchemaVersion: vi.fn().mockResolvedValue(undefined),
    updateSchemaVersion: vi.fn().mockResolvedValue(undefined),
    deleteSchemaVersion: vi.fn().mockResolvedValue(undefined),
    getRegistryStatistics: vi.fn().mockResolvedValue({ productCount: 0, domainCount: 0 }),
    find: vi.fn().mockResolvedValue([]),
  })),
}));

// Mock the other operations classes
vi.mock('../../functions/persistence/userOperations', () => ({
  UserDatabaseOperations: vi.fn().mockImplementation(() => ({
    createUser: vi.fn().mockResolvedValue(undefined),
    updateUser: vi.fn().mockResolvedValue(undefined),
    deleteUser: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../functions/persistence/subscriptionOperations', () => ({
  SubscriptionOperations: vi.fn().mockImplementation(() => ({
    createSubscription: vi.fn().mockResolvedValue(undefined),
    deleteSubscription: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../functions/persistence/changeTrackingOperations', () => ({
  ChangeTrackingOperations: vi.fn().mockImplementation(() => ({
    recordChange: vi.fn().mockResolvedValue(undefined),
    getChanges: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('../../functions/services/sessionService', () => ({
  SessionService: vi.fn().mockImplementation(() => ({
    extractTokenFromCookie: vi.fn().mockReturnValue(null),
    extractTokenFromHeader: vi.fn().mockReturnValue(null),
    getSessionByToken: vi.fn().mockResolvedValue(null),
  })),
}));

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn().mockReturnValue('test-uuid'),
  },
  writable: true,
});

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('SchemaRegistryInstance', () => {
  let instance: SchemaRegistryInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    instance = new SchemaRegistryInstance(mockDurableObjectState as any, mockEnv);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockConsoleError.mockClear();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct dependencies', () => {
      expect(instance).toBeDefined();
    });

    it('should handle schema initialization for new database', async () => {
      const { DatabaseMigrations } = await import('../../functions/persistence/migrations');
      const mockMigrations = (DatabaseMigrations as any).mock.results[0].value;
      mockMigrations.needsInitialization.mockResolvedValue(true);

      const request = new Request('http://localhost/products');
      const response = await instance.fetch(request);

      expect(mockMigrations.needsInitialization).toHaveBeenCalled();
      expect(mockMigrations.initializeSchema).toHaveBeenCalled();
      expect(mockMigrations.initializeSampleData).toHaveBeenCalled();
    });

    it('should handle schema migration for existing database', async () => {
      const { DatabaseMigrations } = await import('../../functions/persistence/migrations');
      const mockMigrations = (DatabaseMigrations as any).mock.results[0].value;
      mockMigrations.needsInitialization.mockResolvedValue(false);

      const request = new Request('http://localhost/products');
      await instance.fetch(request);

      expect(mockMigrations.runMigrations).toHaveBeenCalled();
    });
  });

  describe('CORS Handling', () => {
    it('should handle OPTIONS requests with CORS headers', async () => {
      const request = new Request('http://localhost/products', { method: 'OPTIONS' });
      const response = await instance.fetch(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    });

    it('should add CORS headers to all responses', async () => {
      const request = new Request('http://localhost/products');
      const response = await instance.fetch(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
    });
  });

  describe('Error Handling', () => {
    it('should handle schema initialization errors', async () => {
      const testInstance = new SchemaRegistryInstance(mockDurableObjectState as any, mockEnv);

      // Spy on the migrations needsInitialization method to simulate an initialization error
      const mockNeedsInitialization = vi.fn().mockRejectedValue(new Error('Init failed'));
      vi.spyOn((testInstance as any).migrations, 'needsInitialization').mockImplementation(mockNeedsInitialization);

      const request = new Request('http://localhost/products');
      const response = await testInstance.fetch(request);

      expect(response.status).toBe(500);
      expect(mockConsoleError).toHaveBeenCalledWith('Schema initialization error:', expect.any(Error));
    });

    it('should handle general request errors gracefully', async () => {
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      mockOperations.getAllProducts.mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/products');
      const response = await instance.fetch(request);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe('Internal Server Error');
      expect(mockConsoleError).toHaveBeenCalledWith('Registry Instance Error:', expect.any(Error));
    });
  });

  describe('Product Operations', () => {
    it('should handle GET all products', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', domains: [] }
      ];
      
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      mockOperations.getAllProducts.mockResolvedValue(mockProducts);

      const request = new Request('http://localhost/products');
      const response = await instance.fetch(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.products).toEqual(mockProducts);
      expect(mockOperations.getAllProducts).toHaveBeenCalled();
    });

    it('should handle GET single product', async () => {
      const mockProduct = { id: '1', name: 'Product 1', domains: [] };
      
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      mockOperations.getProductById.mockResolvedValue(mockProduct);

      const request = new Request('http://localhost/products/1');
      const response = await instance.fetch(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData).toEqual(mockProduct);
      expect(mockOperations.getProductById).toHaveBeenCalledWith('1');
    });

    it('should handle GET non-existent product', async () => {
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      mockOperations.getProductById.mockResolvedValue(null);

      const request = new Request('http://localhost/products/nonexistent');
      const response = await instance.fetch(request);

      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData.error).toBe('Product not found');
    });

    it('should handle POST create product', async () => {
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      
      const productData = { name: 'New Product', description: 'Product description' };
      const request = new Request('http://localhost/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      
      const response = await instance.fetch(request);

      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.id).toBe('test-uuid');
      expect(responseData.name).toBe('New Product');
      expect(responseData.description).toBe('Product description');
      expect(responseData.domains).toEqual([]);
      expect(mockOperations.createProduct).toHaveBeenCalledWith(
        'test-uuid', 
        'New Product', 
        'Product description'
      );
    });

    it('should handle PUT update product', async () => {
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      
      const updateData = { name: 'Updated Product', description: 'Updated description' };
      const request = new Request('http://localhost/products/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      const response = await instance.fetch(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.updatedAt).toBeDefined();
      expect(mockOperations.updateProduct).toHaveBeenCalledWith(
        '1', 
        'Updated Product', 
        'Updated description'
      );
    });

    it('should handle DELETE product', async () => {
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      
      const request = new Request('http://localhost/products/1', { method: 'DELETE' });
      const response = await instance.fetch(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(mockOperations.deleteProduct).toHaveBeenCalledWith('1');
    });

    it('should handle unsupported methods for products', async () => {
      const request = new Request('http://localhost/products', { method: 'PATCH' });
      const response = await instance.fetch(request);

      expect(response.status).toBe(405);
      const responseData = await response.json();
      expect(responseData.error).toBe('Method not allowed');
    });
  });

  describe('Domain Operations', () => {
    it('should handle GET all domains', async () => {
      const mockDomains = [
        { id: '1', name: 'Domain 1', productId: 'product1' }
      ];
      
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      mockOperations.getAllDomains.mockResolvedValue(mockDomains);

      const request = new Request('http://localhost/domains');
      const response = await instance.fetch(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.domains).toEqual(mockDomains);
    });

    it('should handle POST create domain', async () => {
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      
      const domainData = { 
        name: 'New Domain', 
        description: 'Domain description',
        productId: 'product1'
      };
      
      const request = new Request('http://localhost/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(domainData)
      });
      
      const response = await instance.fetch(request);

      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.id).toBe('test-uuid');
      expect(responseData.name).toBe('New Domain');
      expect(responseData.productId).toBe('product1');
      expect(responseData.contexts).toEqual([]);
      expect(mockOperations.createDomain).toHaveBeenCalledWith(
        'test-uuid', 
        'New Domain', 
        'Domain description',
        'product1'
      );
    });
  });

  describe('Context Operations', () => {
    it('should handle POST create context', async () => {
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      
      const contextData = { 
        name: 'New Context', 
        description: 'Context description',
        domainId: 'domain1'
      };
      
      const request = new Request('http://localhost/contexts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextData)
      });
      
      const response = await instance.fetch(request);

      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.id).toBe('test-uuid');
      expect(responseData.name).toBe('New Context');
      expect(responseData.domainId).toBe('domain1');
      expect(responseData.schemas).toEqual([]);
      expect(mockOperations.createContext).toHaveBeenCalledWith(
        'test-uuid', 
        'New Context',
        null,
        'Context description',
        'domain1'
      );
    });
  });

  describe('Schema Operations', () => {
    it('should handle POST create schema', async () => {
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      
      const schemaData = { 
        name: 'New Schema', 
        description: 'Schema description',
        schemaTypeCategory: 'command',
        scope: 'public',
        contextId: 'context1'
      };
      
      const request = new Request('http://localhost/schemas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schemaData)
      });
      
      const response = await instance.fetch(request);

      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.id).toBe('test-uuid');
      expect(responseData.name).toBe('New Schema');
      expect(responseData.schemaTypeCategory).toBe('command');
      expect(responseData.scope).toBe('public');
      expect(responseData.versions).toEqual([]);
      expect(mockOperations.createSchema).toHaveBeenCalledWith(
        'test-uuid', 
        'New Schema', 
        'Schema description',
        'command',
        'public',
        'context1'
      );
    });

    it('should handle PUT update schema with version specifications', async () => {
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      
      const updateData = {
        name: 'Updated Schema',
        description: 'Updated description',
        schemaTypeCategory: 'event',
        scope: 'private',
        versions: [{
          versionId: 'version1',
          specification: 'event UpdatedSchema { string field }',
          semanticVersion: '1.1.0',
          description: 'Updated version',
          status: 'published'
        }]
      };
      
      const request = new Request('http://localhost/schemas/schema1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      const response = await instance.fetch(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(mockOperations.updateSchemaWithVersionSpecifications).toHaveBeenCalledWith(
        'schema1',
        'Updated Schema',
        'Updated description',
        'event',
        'private',
        [{
          versionId: 'version1',
          specification: 'event UpdatedSchema { string field }',
          semanticVersion: '1.1.0',
          description: 'Updated version',
          status: 'published'
        }]
      );
    });

    it('should handle PUT update schema without version specifications', async () => {
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      
      const updateData = {
        name: 'Updated Schema',
        description: 'Updated description',
        schemaTypeCategory: 'data',
        scope: 'public'
      };
      
      const request = new Request('http://localhost/schemas/schema1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      const response = await instance.fetch(request);

      expect(response.status).toBe(200);
      expect(mockOperations.updateSchema).toHaveBeenCalledWith(
        'schema1',
        'Updated Schema',
        'Updated description',
        'data',
        'public'
      );
    });
  });

  describe('Schema Version Operations', () => {
    it('should handle POST create schema version', async () => {
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      
      const versionData = { 
        specification: 'command TestCommand { string name }',
        semanticVersion: '1.0.0',
        description: 'Initial version',
        status: 'draft',
        schemaId: 'schema1'
      };
      
      const request = new Request('http://localhost/schema-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(versionData)
      });
      
      const response = await instance.fetch(request);

      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.id).toBe('test-uuid');
      expect(responseData.specification).toBe('command TestCommand { string name }');
      expect(responseData.semanticVersion).toBe('1.0.0');
      expect(responseData.status).toBe('draft');
      expect(mockOperations.createSchemaVersion).toHaveBeenCalledWith(
        'test-uuid',
        'command TestCommand { string name }',
        '1.0.0',
        'Initial version',
        'draft',
        'schema1'
      );
    });
  });

  describe('Registry Operations', () => {
    it('should handle GET registry statistics', async () => {
      const mockStats = {
        productCount: 5,
        domainCount: 10,
        contextCount: 15,
        schemaCount: 20,
        versionCount: 25
      };
      
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      mockOperations.getRegistryStatistics.mockResolvedValue(mockStats);

      const request = new Request('http://localhost/registry');
      const response = await instance.fetch(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.stats).toEqual(mockStats);
    });

    it('should handle registry statistics errors', async () => {
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      mockOperations.getRegistryStatistics.mockRejectedValue(new Error('Stats error'));

      const request = new Request('http://localhost/registry');
      const response = await instance.fetch(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.stats.error).toBe('Failed to get stats');
    });
  });

  describe('Find Operations', () => {
    it('should handle GET find with query parameter', async () => {
      const mockResults = [
        {
          type: 'schema',
          entity_id: 'schema1',
          name: 'TestSchema',
          description: 'A test schema',
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
      
      const { DatabaseOperations } = await import('../../functions/persistence/operations');
      const mockOperations = (DatabaseOperations as any).mock.results[0].value;
      mockOperations.find.mockResolvedValue(mockResults);

      const request = new Request('http://localhost/find?q=test');
      const response = await instance.fetch(request);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.results).toHaveLength(1);
      expect(responseData.results[0].type).toBe('schema');
      expect(responseData.results[0].name).toBe('TestSchema');
      expect(responseData.results[0].path).toBe('Product 1 > Domain 1 > Context 1');
      expect(mockOperations.find).toHaveBeenCalledWith('test');
    });

    it('should handle GET find without query parameter', async () => {
      const request = new Request('http://localhost/find');
      const response = await instance.fetch(request);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toBe('Query parameter "q" is required');
    });

    it('should handle GET find with empty query parameter', async () => {
      const request = new Request('http://localhost/find?q=');
      const response = await instance.fetch(request);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toBe('Query parameter "q" is required');
    });
  });

  describe('Route Handling', () => {
    it('should handle unknown resource paths', async () => {
      const request = new Request('http://localhost/unknown-resource');
      const response = await instance.fetch(request);

      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData.error).toBe('Resource not found');
    });

    it('should handle invalid method for known resources', async () => {
      const request = new Request('http://localhost/products/1', { method: 'PATCH' });
      const response = await instance.fetch(request);

      expect(response.status).toBe(405);
      const responseData = await response.json();
      expect(responseData.error).toBe('Method not allowed');
    });
  });

  describe('Timestamp Generation', () => {
    it('should generate consistent timestamp format', async () => {
      const productData = { name: 'Test Product' };
      const request = new Request('http://localhost/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      
      const response = await instance.fetch(request);
      const responseData = await response.json();
      
      // Should be ISO string without milliseconds
      expect(responseData.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(responseData.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(responseData.createdAt).toBe(responseData.updatedAt);
    });
  });

  describe('JSON Parsing and Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const request = new Request('http://localhost/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{'
      });
      
      const response = await instance.fetch(request);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe('Internal Server Error');
    });
  });
});