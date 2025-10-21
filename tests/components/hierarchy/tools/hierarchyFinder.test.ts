import { describe, it, expect } from 'vitest';
import { HierarchyFinder } from '../../../../src/components/hierarchy/tools/hierarchyFinder';
import { Product, SchemaTypeCategory } from '../../../../src/types/schema';

// Mock data
const mockProducts: Product[] = [
  {
    id: 'product-1',
    name: 'Test Product',
    domains: [
      {
        id: 'domain-1',
        name: 'Test Domain',
        contexts: [
          {
            id: 'context-1',
            name: 'Test Context',
            schemas: [
              {
                id: 'schema-1',
                name: 'Test Schema',
                schemaTypeCategory: SchemaTypeCategory.Events,
                versions: []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'product-2',
    name: 'Another Product',
    domains: []
  }
];

describe('HierarchyFinder', () => {
  describe('findProductById', () => {
    it('should find existing product', () => {
      const result = HierarchyFinder.findProductById(mockProducts, 'product-1');
      expect(result).toBeTruthy();
      expect(result?.name).toBe('Test Product');
    });

    it('should return null for non-existent product', () => {
      const result = HierarchyFinder.findProductById(mockProducts, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findDomainById', () => {
    it('should find existing domain', () => {
      const result = HierarchyFinder.findDomainById(mockProducts, 'domain-1');
      expect(result).toBeTruthy();
      expect(result?.name).toBe('Test Domain');
    });

    it('should return null for non-existent domain', () => {
      const result = HierarchyFinder.findDomainById(mockProducts, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findContextById', () => {
    it('should find existing context', () => {
      const result = HierarchyFinder.findContextById(mockProducts, 'context-1');
      expect(result).toBeTruthy();
      expect(result?.name).toBe('Test Context');
    });

    it('should return null for non-existent context', () => {
      const result = HierarchyFinder.findContextById(mockProducts, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findSchemaById', () => {
    it('should find existing schema', () => {
      const result = HierarchyFinder.findSchemaById(mockProducts, 'schema-1');
      expect(result).toBeTruthy();
      expect(result?.name).toBe('Test Schema');
    });

    it('should return null for non-existent schema', () => {
      const result = HierarchyFinder.findSchemaById(mockProducts, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findEntityById', () => {
    it('should find product by type', () => {
      const result = HierarchyFinder.findEntityById(mockProducts, 'product', 'product-1');
      expect(result).toBeTruthy();
      expect(result.name).toBe('Test Product');
    });

    it('should find domain by type', () => {
      const result = HierarchyFinder.findEntityById(mockProducts, 'domain', 'domain-1');
      expect(result).toBeTruthy();
      expect(result.name).toBe('Test Domain');
    });

    it('should find context by type', () => {
      const result = HierarchyFinder.findEntityById(mockProducts, 'context', 'context-1');
      expect(result).toBeTruthy();
      expect(result.name).toBe('Test Context');
    });

    it('should find schema by type', () => {
      const result = HierarchyFinder.findEntityById(mockProducts, 'schema', 'schema-1');
      expect(result).toBeTruthy();
      expect(result.name).toBe('Test Schema');
    });

    it('should return null for unknown type', () => {
      const result = HierarchyFinder.findEntityById(mockProducts, 'unknown', 'any-id');
      expect(result).toBeNull();
    });
  });
});