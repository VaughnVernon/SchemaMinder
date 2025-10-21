import { describe, it, expect } from 'vitest';
import { HierarchyExpansionManager } from '../../../../src/components/hierarchy/tools/hierarchyExpansion';
import { Product, SchemaTypeCategory, SchemaStatus } from '../../../../src/types/schema';

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
  }
];

describe('HierarchyExpansionManager', () => {
  describe('toggleAllDescendants', () => {
    it('should expand product descendants when collapsed', () => {
      const expandedItems = new Set<string>();
      
      const result = HierarchyExpansionManager.toggleAllDescendants(
        'product-1',
        'product',
        false, // isCurrentlyExpanded = false (so we're expanding)
        mockProducts,
        expandedItems
      );

      expect(result.has('product-1')).toBe(true);
      expect(result.has('domain-1')).toBe(true);
      expect(result.has('context-1')).toBe(true);
      expect(result.has('context-1-Events')).toBe(true); // category ID
      expect(result.has('schema-1')).toBe(true);
    });

    it('should collapse product descendants when expanded', () => {
      const expandedItems = new Set([
        'product-1',
        'domain-1', 
        'context-1',
        'context-1-Events',
        'schema-1'
      ]);
      
      const result = HierarchyExpansionManager.toggleAllDescendants(
        'product-1',
        'product',
        true, // isCurrentlyExpanded = true (so we're collapsing)
        mockProducts,
        expandedItems
      );

      expect(result.has('product-1')).toBe(false);
      expect(result.has('domain-1')).toBe(false);
      expect(result.has('context-1')).toBe(false);
      expect(result.has('context-1-Events')).toBe(false);
      expect(result.has('schema-1')).toBe(false);
    });

    it('should handle domain expansion', () => {
      const expandedItems = new Set<string>();
      
      const result = HierarchyExpansionManager.toggleAllDescendants(
        'domain-1',
        'domain',
        false,
        mockProducts,
        expandedItems
      );

      expect(result.has('domain-1')).toBe(true);
      expect(result.has('context-1')).toBe(true);
      expect(result.has('context-1-Events')).toBe(true);
      expect(result.has('schema-1')).toBe(true);
    });

    it('should handle context expansion', () => {
      const expandedItems = new Set<string>();
      
      const result = HierarchyExpansionManager.toggleAllDescendants(
        'context-1',
        'context',
        false,
        mockProducts,
        expandedItems
      );

      expect(result.has('context-1')).toBe(true);
      expect(result.has('context-1-Events')).toBe(true);
      expect(result.has('schema-1')).toBe(true);
    });

    it('should handle category expansion', () => {
      const expandedItems = new Set<string>();
      
      const result = HierarchyExpansionManager.toggleAllDescendants(
        'context-1-Events',
        'category',
        false,
        mockProducts,
        expandedItems
      );

      expect(result.has('context-1-Events')).toBe(true);
      expect(result.has('schema-1')).toBe(true);
    });

    it('should return original set when entity not found', () => {
      const expandedItems = new Set(['existing-item']);
      
      const result = HierarchyExpansionManager.toggleAllDescendants(
        'non-existent',
        'product',
        false,
        mockProducts,
        expandedItems
      );

      expect(result.has('existing-item')).toBe(true);
      expect(result.size).toBe(1);
    });
  });
});