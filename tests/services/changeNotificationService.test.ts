import { describe, it, expect, beforeEach } from 'vitest';
import { ChangeNotificationService } from '../../src/services/changeNotificationService';
import { SchemaRegistry, Product, Domain, Context, Schema, SchemaVersion, SchemaTypeCategory, SchemaStatus } from '../../src/types/schema';

describe('ChangeNotificationService', () => {
  let service: ChangeNotificationService;
  let mockRegistry: SchemaRegistry;

  beforeEach(() => {
    // Create a mock registry with test data
    const mockVersion: SchemaVersion = {
      id: 'version-1',
      schemaId: 'schema-1',
      semanticVersion: '1.0.0',
      status: SchemaStatus.Published,
      specification: 'data TestSchema { string name }',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    const mockSchema: Schema = {
      id: 'schema-1',
      name: 'TestSchema',
      schemaTypeCategory: SchemaTypeCategory.Data,
      contextId: 'context-1',
      scope: 'Public',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      versions: [mockVersion]
    };

    const mockContext: Context = {
      id: 'context-1',
      name: 'TestContext',
      namespace: 'Com.Example.Test',
      domainId: 'domain-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      schemas: [mockSchema]
    };

    const mockDomain: Domain = {
      id: 'domain-1',
      name: 'TestDomain',
      productId: 'product-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      contexts: [mockContext]
    };

    const mockProduct: Product = {
      id: 'product-1',
      name: 'TestProduct',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      domains: [mockDomain]
    };

    mockRegistry = {
      products: [mockProduct]
    };

    service = new ChangeNotificationService(mockRegistry);
  });

  describe('formatChangeType', () => {
    it('should format product created', () => {
      const result = service.formatChangeType('product', 'created');
      expect(result).toBe('Product Created');
    });

    it('should format domain updated', () => {
      const result = service.formatChangeType('domain', 'updated');
      expect(result).toBe('Domain Updated');
    });

    it('should format context deleted', () => {
      const result = service.formatChangeType('context', 'deleted');
      expect(result).toBe('Context Deleted');
    });

    it('should format schema created', () => {
      const result = service.formatChangeType('schema', 'created');
      expect(result).toBe('Schema Created');
    });

    it('should format schema version updated', () => {
      const result = service.formatChangeType('schema_version', 'updated');
      expect(result).toBe('Version Updated');
    });

    it('should handle unknown entity type', () => {
      const result = service.formatChangeType('unknown_type', 'created');
      expect(result).toBe('unknown_type Created');
    });

    it('should handle unknown change type', () => {
      const result = service.formatChangeType('product', 'archived');
      expect(result).toBe('Product archived');
    });
  });

  describe('getEntityInfo', () => {
    it('should get entity info from registry for existing product', () => {
      const change = {
        entityType: 'product',
        entityId: 'product-1',
        changeData: {}
      };

      const result = service.getEntityInfo(change);

      expect(result.type).toBe('Product');
      expect(result.name).toBe('TestProduct');
    });

    it('should get entity info from registry for existing schema', () => {
      const change = {
        entityType: 'schema',
        entityId: 'schema-1',
        changeData: {}
      };

      const result = service.getEntityInfo(change);

      expect(result.type).toBe('Data');  // Returns category's friendlyName from SCHEMA_TYPE_CATEGORIES
      expect(result.name).toBe('TestSchema');
    });

    it('should fallback to change data when entity not found', () => {
      const change = {
        entityType: 'product',
        entityId: 'non-existent-id',
        entityName: 'FallbackProduct',
        changeData: {
          name: 'ProductFromChangeData'
        }
      };

      const result = service.getEntityInfo(change);

      expect(result.type).toBe('Product');
      expect(result.name).toBe('FallbackProduct');
    });

    it('should use changeData.name as fallback', () => {
      const change = {
        entityType: 'domain',
        entityId: 'unknown-id',
        changeData: {
          name: 'DomainName'
        }
      };

      const result = service.getEntityInfo(change);

      expect(result.type).toBe('Domain');
      expect(result.name).toBe('DomainName');
    });

    it('should use changeData.after.name as fallback', () => {
      const change = {
        entityType: 'context',
        entityId: 'unknown-id',
        changeData: {
          after: {
            name: 'NewContextName'
          }
        }
      };

      const result = service.getEntityInfo(change);

      expect(result.type).toBe('Context');
      expect(result.name).toBe('NewContextName');
    });

    it('should use changeData.before.name as last fallback', () => {
      const change = {
        entityType: 'schema',
        entityId: 'unknown-id',
        changeData: {
          before: {
            name: 'OldSchemaName'
          }
        }
      };

      const result = service.getEntityInfo(change);

      expect(result.type).toBe('Schema');
      expect(result.name).toBe('OldSchemaName');
    });

    it('should use entityId as ultimate fallback', () => {
      const change = {
        entityType: 'product',
        entityId: 'product-123',
        changeData: {}
      };

      const result = service.getEntityInfo(change);

      expect(result.type).toBe('Product');
      expect(result.name).toBe('product-123');
    });
  });

  describe('getEntityPath', () => {
    it('should get hierarchy path from registry for existing entity', () => {
      const change = {
        entityType: 'schema',
        entityId: 'schema-1',
        changeData: {}
      };

      const result = service.getEntityPath(change);

      expect(result).toBe('TestProduct > TestDomain > TestContext > TestSchema');
    });

    it('should get path from registry for product', () => {
      const change = {
        entityType: 'product',
        entityId: 'product-1',
        changeData: {}
      };

      const result = service.getEntityPath(change);

      expect(result).toBe('TestProduct');
    });

    it('should get path from registry for domain', () => {
      const change = {
        entityType: 'domain',
        entityId: 'domain-1',
        changeData: {}
      };

      const result = service.getEntityPath(change);

      expect(result).toBe('TestProduct > TestDomain');
    });

    it('should fallback to extracting path from change data', () => {
      const change = {
        entityType: 'schema',
        entityId: 'unknown-schema',
        entityName: 'UnknownSchema',
        changeData: {
          before: {
            product_name: 'MyProduct',
            domain_name: 'MyDomain',
            context_name: 'MyContext',
            schema_name: 'MySchema'
          }
        }
      };

      const result = service.getEntityPath(change);

      // extractPathFromChangeData adds both schema_name (line 90) AND entityName (line 95)
      expect(result).toBe('MyProduct > MyDomain > MyContext > MySchema > UnknownSchema');
    });

    it('should handle schema_version with version number', () => {
      const change = {
        entityType: 'schema_version',
        entityId: 'unknown-version',
        changeData: {
          before: {
            product_name: 'Product1',
            domain_name: 'Domain1',
            context_name: 'Context1',
            schema_name: 'Schema1',
            semanticVersion: '2.0.0'
          }
        }
      };

      const result = service.getEntityPath(change);

      expect(result).toBe('Product1 > Domain1 > Context1 > Schema1 > 2.0.0');
    });

    it('should handle partial hierarchy from change data', () => {
      const change = {
        entityType: 'context',
        entityId: 'unknown-context',
        entityName: 'PartialContext',
        changeData: {
          product_name: 'Product1',
          domain_name: 'Domain1'
        }
      };

      const result = service.getEntityPath(change);

      expect(result).toBe('Product1 > Domain1 > PartialContext');
    });

    it('should handle change data with after properties', () => {
      const change = {
        entityType: 'domain',
        entityId: 'new-domain',
        entityName: 'NewDomain',
        changeData: {
          after: {
            product_name: 'NewProduct'
          }
        }
      };

      const result = service.getEntityPath(change);

      expect(result).toBe('NewProduct > NewDomain');
    });

    it('should handle missing hierarchy data gracefully', () => {
      const change = {
        entityType: 'product',
        entityId: 'orphan-product',
        entityName: 'OrphanProduct',
        changeData: {}
      };

      const result = service.getEntityPath(change);

      expect(result).toBe('OrphanProduct');
    });
  });

  describe('getFieldValue', () => {
    it('should get field value directly', () => {
      const data = { name: 'TestName', description: 'Test Description' };
      expect(service.getFieldValue(data, 'name')).toBe('TestName');
      expect(service.getFieldValue(data, 'description')).toBe('Test Description');
    });

    it('should handle semanticVersion with camelCase', () => {
      const data = { semanticVersion: '1.0.0' };
      expect(service.getFieldValue(data, 'semanticVersion')).toBe('1.0.0');
    });

    it('should handle semanticVersion with snake_case', () => {
      const data = { semantic_version: '2.0.0' };
      expect(service.getFieldValue(data, 'semanticVersion')).toBe('2.0.0');
    });

    it('should prefer camelCase over snake_case', () => {
      const data = { semanticVersion: '1.0.0', semantic_version: '2.0.0' };
      expect(service.getFieldValue(data, 'semanticVersion')).toBe('1.0.0');
    });

    it('should return undefined for missing field', () => {
      const data = { name: 'Test' };
      expect(service.getFieldValue(data, 'nonexistent')).toBeUndefined();
    });
  });

  describe('formatValue', () => {
    it('should return value as-is for non-specification fields', () => {
      expect(service.formatValue('name', 'TestName')).toBe('TestName');
      expect(service.formatValue('description', 'Some description')).toBe('Some description');
      expect(service.formatValue('status', 'Published')).toBe('Published');
    });

    it('should not truncate short specifications', () => {
      const shortSpec = 'data Test { string name }';
      expect(service.formatValue('specification', shortSpec)).toBe(shortSpec);
    });

    it('should truncate long specifications', () => {
      const longSpec = 'x'.repeat(250);
      const result = service.formatValue('specification', longSpec);

      expect(result).toHaveLength(203); // 200 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should truncate at exactly 200 characters', () => {
      const longSpec = 'a'.repeat(300);
      const result = service.formatValue('specification', longSpec);

      expect(result.substring(0, 200)).toBe('a'.repeat(200));
      expect(result).toBe('a'.repeat(200) + '...');
    });

    it('should handle non-string values', () => {
      expect(service.formatValue('count', 42)).toBe(42);
      expect(service.formatValue('isActive', true)).toBe(true);
      expect(service.formatValue('data', null)).toBe(null);
    });
  });

  describe('getRelevantFields', () => {
    it('should return fields for product', () => {
      const fields = service.getRelevantFields('product');
      expect(fields).toEqual(['name', 'description']);
    });

    it('should return fields for domain', () => {
      const fields = service.getRelevantFields('domain');
      expect(fields).toEqual(['name', 'description']);
    });

    it('should return fields for context', () => {
      const fields = service.getRelevantFields('context');
      expect(fields).toEqual(['name', 'namespace', 'description']);
    });

    it('should return fields for schema', () => {
      const fields = service.getRelevantFields('schema');
      expect(fields).toEqual(['name', 'description', 'schemaTypeCategory', 'scope']);
    });

    it('should return fields for schema_version', () => {
      const fields = service.getRelevantFields('schema_version');
      expect(fields).toEqual(['semanticVersion', 'description', 'status', 'specification']);
    });

    it('should return default fields for unknown entity type', () => {
      const fields = service.getRelevantFields('unknown_type');
      expect(fields).toEqual(['specification', 'status']);
    });
  });

  describe('extractChangedFields', () => {
    it('should extract fields that changed', () => {
      const before = {
        name: 'OldName',
        description: 'OldDescription',
        status: 'Draft'
      };

      const after = {
        name: 'NewName',
        description: 'OldDescription',
        status: 'Published'
      };

      const { beforeData, afterData } = service.extractChangedFields(before, after, ['name', 'description', 'status']);

      expect(beforeData).toEqual({
        name: 'OldName',
        status: 'Draft'
      });

      expect(afterData).toEqual({
        name: 'NewName',
        status: 'Published'
      });
    });

    it('should not include unchanged fields', () => {
      const before = {
        name: 'SameName',
        description: 'Same description',
        status: 'Published'
      };

      const after = {
        name: 'SameName',
        description: 'Same description',
        status: 'Published'
      };

      const { beforeData, afterData } = service.extractChangedFields(before, after, ['name', 'description', 'status']);

      expect(beforeData).toEqual({});
      expect(afterData).toEqual({});
    });

    it('should handle fields only in before', () => {
      const before = {
        name: 'Name',
        description: 'Description'
      };

      const after = {
        name: 'NewName'
      };

      const { beforeData, afterData } = service.extractChangedFields(before, after, ['name', 'description']);

      expect(beforeData).toEqual({
        name: 'Name',
        description: 'Description'
      });

      expect(afterData).toEqual({
        name: 'NewName'
      });
    });

    it('should handle fields only in after', () => {
      const before = {
        name: 'Name'
      };

      const after = {
        name: 'Name',
        description: 'NewDescription'
      };

      const { beforeData, afterData } = service.extractChangedFields(before, after, ['name', 'description']);

      expect(beforeData).toEqual({});

      expect(afterData).toEqual({
        description: 'NewDescription'
      });
    });

    it('should handle semanticVersion field with snake_case', () => {
      const before = {
        semantic_version: '1.0.0'
      };

      const after = {
        semanticVersion: '2.0.0'
      };

      const { beforeData, afterData } = service.extractChangedFields(before, after, ['semanticVersion']);

      expect(beforeData).toEqual({
        semanticVersion: '1.0.0'
      });

      expect(afterData).toEqual({
        semanticVersion: '2.0.0'
      });
    });

    it('should handle empty before and after', () => {
      const { beforeData, afterData } = service.extractChangedFields({}, {}, ['name', 'description']);

      expect(beforeData).toEqual({});
      expect(afterData).toEqual({});
    });

    it('should only check specified fields', () => {
      const before = {
        name: 'OldName',
        description: 'OldDescription',
        status: 'Draft',
        extraField: 'OldExtra'
      };

      const after = {
        name: 'NewName',
        description: 'NewDescription',
        status: 'Published',
        extraField: 'NewExtra'
      };

      const { beforeData, afterData } = service.extractChangedFields(before, after, ['name', 'description']);

      expect(beforeData).toEqual({
        name: 'OldName',
        description: 'OldDescription'
      });

      expect(afterData).toEqual({
        name: 'NewName',
        description: 'NewDescription'
      });

      expect(beforeData).not.toHaveProperty('status');
      expect(beforeData).not.toHaveProperty('extraField');
    });
  });
});
