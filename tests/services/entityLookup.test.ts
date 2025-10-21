import { describe, it, expect } from 'vitest';
import { EntityLookupService } from '../../src/services/entityLookup';
import { SchemaRegistry, SchemaTypeCategory, SchemaScope, SchemaStatus } from '../../src/types/schema';

describe('EntityLookupService', () => {
  // Create comprehensive test data
  const mockRegistry: SchemaRegistry = {
    products: [
      {
        id: 'product-1',
        name: 'E-commerce Platform',
        description: 'Main e-commerce platform',
        domains: [
          {
            id: 'domain-1',
            name: 'User Management',
            description: 'User management domain',
            productId: 'product-1',
            contexts: [
              {
                id: 'context-1',
                name: 'Authentication',
                description: 'User authentication context',
                domainId: 'domain-1',
                schemas: [
                  {
                    id: 'schema-1',
                    name: 'UserLogin',
                    description: 'User login event',
                    schemaTypeCategory: SchemaTypeCategory.Events,
                    scope: SchemaScope.Public,
                    contextId: 'context-1',
                    versions: [
                      {
                        id: 'version-1',
                        semanticVersion: '1.0.0',
                        specification: 'event UserLogin { userId: string }',
                        description: 'Initial version',
                        status: SchemaStatus.Published,
                        schemaId: 'schema-1',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      },
                      {
                        id: 'version-2',
                        semanticVersion: '1.1.0',
                        specification: 'event UserLogin { userId: string, timestamp: string }',
                        description: 'Added timestamp',
                        status: SchemaStatus.Draft,
                        schemaId: 'schema-1',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      }
                    ],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  },
                  {
                    id: 'schema-2',
                    name: 'GetUserProfile',
                    description: 'Get user profile query',
                    schemaTypeCategory: SchemaTypeCategory.Queries,
                    scope: SchemaScope.Internal,
                    contextId: 'context-1',
                    versions: [
                      {
                        id: 'version-3',
                        semanticVersion: '2.0.0',
                        specification: 'query GetUserProfile { userId: string }',
                        description: 'Query version',
                        status: SchemaStatus.Published,
                        schemaId: 'schema-2',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      }
                    ],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  }
                ]
              },
              {
                id: 'context-2',
                name: 'Profile',
                description: 'User profile context',
                domainId: 'domain-1',
                schemas: []
              }
            ]
          },
          {
            id: 'domain-2',
            name: 'Order Management',
            description: 'Order management domain',
            productId: 'product-1',
            contexts: [
              {
                id: 'context-3',
                name: 'Orders',
                description: 'Order processing context',
                domainId: 'domain-2',
                schemas: [
                  {
                    id: 'schema-3',
                    name: 'CreateOrder',
                    description: 'Create order command',
                    schemaTypeCategory: SchemaTypeCategory.Commands,
                    scope: SchemaScope.Public,
                    contextId: 'context-3',
                    versions: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'product-2',
        name: 'Analytics Platform',
        description: 'Analytics and reporting platform',
        domains: [
          {
            id: 'domain-3',
            name: 'Reporting',
            description: 'Reporting domain',
            productId: 'product-2',
            contexts: []
          }
        ]
      },
      {
        id: 'product-3',
        name: 'Empty Product',
        description: 'Product with no domains',
        domains: []
      }
    ]
  };

  let service: EntityLookupService;

  beforeEach(() => {
    service = new EntityLookupService(mockRegistry);
  });

  describe('findProductById', () => {
    it('should find existing product by id', () => {
      const product = service.findProductById('product-1');
      expect(product).not.toBeNull();
      expect(product!.name).toBe('E-commerce Platform');
      expect(product!.id).toBe('product-1');
    });

    it('should return null for non-existent product', () => {
      const product = service.findProductById('non-existent');
      expect(product).toBeNull();
    });

    it('should return null for empty string id', () => {
      const product = service.findProductById('');
      expect(product).toBeNull();
    });

    it('should find all products in registry', () => {
      expect(service.findProductById('product-1')).not.toBeNull();
      expect(service.findProductById('product-2')).not.toBeNull();
      expect(service.findProductById('product-3')).not.toBeNull();
    });
  });

  describe('findDomainById', () => {
    it('should find existing domain by id', () => {
      const domain = service.findDomainById('domain-1');
      expect(domain).not.toBeNull();
      expect(domain!.name).toBe('User Management');
      expect(domain!.id).toBe('domain-1');
      expect(domain!.productId).toBe('product-1');
    });

    it('should find domain in different product', () => {
      const domain = service.findDomainById('domain-3');
      expect(domain).not.toBeNull();
      expect(domain!.name).toBe('Reporting');
      expect(domain!.productId).toBe('product-2');
    });

    it('should return null for non-existent domain', () => {
      const domain = service.findDomainById('non-existent');
      expect(domain).toBeNull();
    });

    it('should return null for empty string id', () => {
      const domain = service.findDomainById('');
      expect(domain).toBeNull();
    });
  });

  describe('findContextById', () => {
    it('should find existing context by id', () => {
      const context = service.findContextById('context-1');
      expect(context).not.toBeNull();
      expect(context!.name).toBe('Authentication');
      expect(context!.id).toBe('context-1');
      expect(context!.domainId).toBe('domain-1');
    });

    it('should find context in different domain', () => {
      const context = service.findContextById('context-3');
      expect(context).not.toBeNull();
      expect(context!.name).toBe('Orders');
      expect(context!.domainId).toBe('domain-2');
    });

    it('should return null for non-existent context', () => {
      const context = service.findContextById('non-existent');
      expect(context).toBeNull();
    });

    it('should return null for empty string id', () => {
      const context = service.findContextById('');
      expect(context).toBeNull();
    });
  });

  describe('findSchemaById', () => {
    it('should find existing schema by id', () => {
      const schema = service.findSchemaById('schema-1');
      expect(schema).not.toBeNull();
      expect(schema!.name).toBe('UserLogin');
      expect(schema!.id).toBe('schema-1');
      expect(schema!.contextId).toBe('context-1');
      expect(schema!.schemaTypeCategory).toBe(SchemaTypeCategory.Events);
    });

    it('should find schema with different type category', () => {
      const schema = service.findSchemaById('schema-2');
      expect(schema).not.toBeNull();
      expect(schema!.name).toBe('GetUserProfile');
      expect(schema!.schemaTypeCategory).toBe(SchemaTypeCategory.Queries);
    });

    it('should find schema in different context', () => {
      const schema = service.findSchemaById('schema-3');
      expect(schema).not.toBeNull();
      expect(schema!.name).toBe('CreateOrder');
      expect(schema!.contextId).toBe('context-3');
    });

    it('should return null for non-existent schema', () => {
      const schema = service.findSchemaById('non-existent');
      expect(schema).toBeNull();
    });

    it('should return null for empty string id', () => {
      const schema = service.findSchemaById('');
      expect(schema).toBeNull();
    });
  });

  describe('findSchemaVersionById', () => {
    it('should find existing schema version by id', () => {
      const result = service.findSchemaVersionById('version-1');
      expect(result).not.toBeNull();
      expect(result!.version.semanticVersion).toBe('1.0.0');
      expect(result!.version.id).toBe('version-1');
      expect(result!.schema.name).toBe('UserLogin');
      expect(result!.schema.id).toBe('schema-1');
    });

    it('should find different version of same schema', () => {
      const result = service.findSchemaVersionById('version-2');
      expect(result).not.toBeNull();
      expect(result!.version.semanticVersion).toBe('1.1.0');
      expect(result!.schema.name).toBe('UserLogin');
    });

    it('should find version of different schema', () => {
      const result = service.findSchemaVersionById('version-3');
      expect(result).not.toBeNull();
      expect(result!.version.semanticVersion).toBe('2.0.0');
      expect(result!.schema.name).toBe('GetUserProfile');
    });

    it('should return null for non-existent version', () => {
      const result = service.findSchemaVersionById('non-existent');
      expect(result).toBeNull();
    });

    it('should return null for empty string id', () => {
      const result = service.findSchemaVersionById('');
      expect(result).toBeNull();
    });
  });

  describe('getEntityInfo', () => {
    it('should get product info', () => {
      const info = service.getEntityInfo('product', 'product-1');
      expect(info).toEqual({
        type: 'Product',
        name: 'E-commerce Platform'
      });
    });

    it('should get domain info', () => {
      const info = service.getEntityInfo('domain', 'domain-1');
      expect(info).toEqual({
        type: 'Domain',
        name: 'User Management'
      });
    });

    it('should get context info', () => {
      const info = service.getEntityInfo('context', 'context-1');
      expect(info).toEqual({
        type: 'Context',
        name: 'Authentication'
      });
    });

    it('should get schema info with category mapping', () => {
      const info = service.getEntityInfo('schema', 'schema-1');
      expect(info).toEqual({
        type: 'Event',
        name: 'UserLogin',
        category: SchemaTypeCategory.Events
      });
    });

    it('should get schema info for different category', () => {
      const info = service.getEntityInfo('schema', 'schema-2');
      expect(info).toEqual({
        type: 'Query',
        name: 'GetUserProfile',
        category: SchemaTypeCategory.Queries
      });
    });

    it('should get schema_version info', () => {
      const info = service.getEntityInfo('schema_version', 'version-1');
      expect(info).toEqual({
        type: 'Event',
        name: 'UserLogin',
        category: SchemaTypeCategory.Events
      });
    });

    it('should return null for unknown entity type', () => {
      const info = service.getEntityInfo('unknown', 'some-id');
      expect(info).toBeNull();
    });

    it('should return null for non-existent entity', () => {
      const info = service.getEntityInfo('product', 'non-existent');
      expect(info).toBeNull();
    });

    it('should return null for empty entity id', () => {
      const info = service.getEntityInfo('product', '');
      expect(info).toBeNull();
    });

    it('should return null for empty entity type', () => {
      const info = service.getEntityInfo('', 'product-1');
      expect(info).toBeNull();
    });
  });

  describe('getEntityHierarchyPath', () => {
    it('should get product hierarchy path', () => {
      const path = service.getEntityHierarchyPath('product', 'product-1');
      expect(path).toEqual(['E-commerce Platform']);
    });

    it('should get domain hierarchy path', () => {
      const path = service.getEntityHierarchyPath('domain', 'domain-1');
      expect(path).toEqual(['E-commerce Platform', 'User Management']);
    });

    it('should get context hierarchy path', () => {
      const path = service.getEntityHierarchyPath('context', 'context-1');
      expect(path).toEqual(['E-commerce Platform', 'User Management', 'Authentication']);
    });

    it('should get schema hierarchy path', () => {
      const path = service.getEntityHierarchyPath('schema', 'schema-1');
      expect(path).toEqual(['E-commerce Platform', 'User Management', 'Authentication', 'UserLogin']);
    });

    it('should get schema_version hierarchy path', () => {
      const path = service.getEntityHierarchyPath('schema_version', 'version-1');
      expect(path).toEqual(['E-commerce Platform', 'User Management', 'Authentication', 'UserLogin', '1.0.0']);
    });

    it('should handle path for schema in different context', () => {
      const path = service.getEntityHierarchyPath('schema', 'schema-3');
      expect(path).toEqual(['E-commerce Platform', 'Order Management', 'Orders', 'CreateOrder']);
    });

    it('should handle path for domain in different product', () => {
      const path = service.getEntityHierarchyPath('domain', 'domain-3');
      expect(path).toEqual(['Analytics Platform', 'Reporting']);
    });

    it('should return empty array for unknown entity type', () => {
      const path = service.getEntityHierarchyPath('unknown', 'some-id');
      expect(path).toEqual([]);
    });

    it('should return empty array for non-existent entity', () => {
      const path = service.getEntityHierarchyPath('product', 'non-existent');
      expect(path).toEqual([]);
    });

    it('should return empty array for empty entity id', () => {
      const path = service.getEntityHierarchyPath('product', '');
      expect(path).toEqual([]);
    });

    it('should handle partial hierarchy when parent entities are missing', () => {
      // Create a service with incomplete data to test partial paths
      const incompleteRegistry: SchemaRegistry = {
        products: [
          {
            id: 'product-partial',
            name: 'Partial Product',
            description: 'Test product',
            domains: [
              {
                id: 'domain-partial',
                name: 'Partial Domain',
                description: 'Test domain',
                productId: 'non-existent-product', // Reference to non-existent product
                contexts: [
                  {
                    id: 'context-partial',
                    name: 'Partial Context',
                    description: 'Test context',
                    domainId: 'domain-partial',
                    schemas: []
                  }
                ]
              }
            ]
          }
        ]
      };

      const partialService = new EntityLookupService(incompleteRegistry);
      const path = partialService.getEntityHierarchyPath('context', 'context-partial');
      expect(path).toEqual(['Partial Domain', 'Partial Context']); // Should work without parent product
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty registry', () => {
      const emptyRegistry: SchemaRegistry = { products: [] };
      const emptyService = new EntityLookupService(emptyRegistry);

      expect(emptyService.findProductById('any-id')).toBeNull();
      expect(emptyService.findDomainById('any-id')).toBeNull();
      expect(emptyService.findContextById('any-id')).toBeNull();
      expect(emptyService.findSchemaById('any-id')).toBeNull();
      expect(emptyService.findSchemaVersionById('any-id')).toBeNull();
      expect(emptyService.getEntityInfo('product', 'any-id')).toBeNull();
      expect(emptyService.getEntityHierarchyPath('product', 'any-id')).toEqual([]);
    });

    it('should handle registry with products but no nested entities', () => {
      const flatRegistry: SchemaRegistry = {
        products: [
          {
            id: 'flat-product',
            name: 'Flat Product',
            description: 'Product with no domains',
            domains: []
          }
        ]
      };
      const flatService = new EntityLookupService(flatRegistry);

      expect(flatService.findProductById('flat-product')).not.toBeNull();
      expect(flatService.findDomainById('any-id')).toBeNull();
      expect(flatService.findContextById('any-id')).toBeNull();
      expect(flatService.findSchemaById('any-id')).toBeNull();
      expect(flatService.findSchemaVersionById('any-id')).toBeNull();
    });

    it('should handle null or undefined values gracefully', () => {
      // These tests ensure the service doesn't crash with unexpected input
      expect(service.findProductById(null as any)).toBeNull();
      expect(service.findProductById(undefined as any)).toBeNull();
      expect(service.getEntityInfo(null as any, 'product-1')).toBeNull();
      expect(service.getEntityInfo('product', null as any)).toBeNull();
      expect(service.getEntityHierarchyPath(null as any, 'product-1')).toEqual([]);
      expect(service.getEntityHierarchyPath('product', null as any)).toEqual([]);
    });
  });
});