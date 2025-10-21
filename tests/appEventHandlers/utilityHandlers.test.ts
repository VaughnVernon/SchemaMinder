import { describe, it, expect, beforeEach } from 'vitest';
import { createUtilityFunctions } from '../../src/appEventHandlers/utilityHandlers';
import { AppEventHandlerDependencies } from '../../src/appEventHandlers/types';

describe('utilityHandlers', () => {
  let mockDeps: AppEventHandlerDependencies;
  let utilities: ReturnType<typeof createUtilityFunctions>;

  beforeEach(() => {
    mockDeps = {
      registry: {
        products: [
          {
            id: 'product-1',
            name: 'Test Product 1',
            domains: [
              {
                id: 'domain-1',
                name: 'Test Domain 1',
                contexts: [
                  {
                    id: 'context-1',
                    name: 'Test Context 1',
                    schemas: [
                      {
                        id: 'schema-1',
                        name: 'Test Schema 1',
                        schemaTypeCategory: 'event'
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            id: 'product-2',
            name: 'Test Product 2',
            domains: [
              {
                id: 'domain-2',
                name: 'Test Domain 2',
                contexts: [
                  {
                    id: 'context-2',
                    name: 'Test Context 2',
                    schemas: [
                      {
                        id: 'schema-2',
                        name: 'Test Schema 2',
                        schemaTypeCategory: 'command'
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      hierarchyState: {
        selectedItem: null,
        expandedItems: new Set()
      }
    } as any;

    utilities = createUtilityFunctions(mockDeps);
  });

  describe('findSelectedProduct', () => {
    it('should return selected product when selectedItem is a product', () => {
      mockDeps.hierarchyState.selectedItem = { type: 'product', id: 'product-1' };

      const result = utilities.findSelectedProduct();

      expect(result).toEqual({
        id: 'product-1',
        name: 'Test Product 1',
        domains: mockDeps.registry.products[0].domains
      });
    });

    it('should return null when selectedItem is not a product', () => {
      mockDeps.hierarchyState.selectedItem = { type: 'domain', id: 'domain-1' };

      const result = utilities.findSelectedProduct();

      expect(result).toBeNull();
    });

    it('should return null when selectedItem is null', () => {
      mockDeps.hierarchyState.selectedItem = null;

      const result = utilities.findSelectedProduct();

      expect(result).toBeNull();
    });

    it('should return null when product ID is not found', () => {
      mockDeps.hierarchyState.selectedItem = { type: 'product', id: 'nonexistent-product' };

      const result = utilities.findSelectedProduct();

      expect(result).toBeNull();
    });
  });

  describe('findSelectedDomain', () => {
    it('should return selected domain when selectedItem is a domain', () => {
      mockDeps.hierarchyState.selectedItem = { type: 'domain', id: 'domain-1' };

      const result = utilities.findSelectedDomain();

      expect(result).toEqual({
        id: 'domain-1',
        name: 'Test Domain 1',
        contexts: mockDeps.registry.products[0].domains[0].contexts
      });
    });

    it('should return domain from second product', () => {
      mockDeps.hierarchyState.selectedItem = { type: 'domain', id: 'domain-2' };

      const result = utilities.findSelectedDomain();

      expect(result).toEqual({
        id: 'domain-2',
        name: 'Test Domain 2',
        contexts: mockDeps.registry.products[1].domains[0].contexts
      });
    });

    it('should return null when selectedItem is not a domain', () => {
      mockDeps.hierarchyState.selectedItem = { type: 'product', id: 'product-1' };

      const result = utilities.findSelectedDomain();

      expect(result).toBeNull();
    });

    it('should return null when selectedItem is null', () => {
      mockDeps.hierarchyState.selectedItem = null;

      const result = utilities.findSelectedDomain();

      expect(result).toBeNull();
    });

    it('should return null when domain ID is not found', () => {
      mockDeps.hierarchyState.selectedItem = { type: 'domain', id: 'nonexistent-domain' };

      const result = utilities.findSelectedDomain();

      expect(result).toBeNull();
    });
  });

  describe('findSelectedContext', () => {
    it('should return selected context when selectedItem is a context', () => {
      mockDeps.hierarchyState.selectedItem = { type: 'context', id: 'context-1' };

      const result = utilities.findSelectedContext();

      expect(result).toEqual({
        id: 'context-1',
        name: 'Test Context 1',
        schemas: mockDeps.registry.products[0].domains[0].contexts[0].schemas
      });
    });

    it('should return context from second product', () => {
      mockDeps.hierarchyState.selectedItem = { type: 'context', id: 'context-2' };

      const result = utilities.findSelectedContext();

      expect(result).toEqual({
        id: 'context-2',
        name: 'Test Context 2',
        schemas: mockDeps.registry.products[1].domains[0].contexts[0].schemas
      });
    });

    it('should return null when selectedItem is not a context', () => {
      mockDeps.hierarchyState.selectedItem = { type: 'domain', id: 'domain-1' };

      const result = utilities.findSelectedContext();

      expect(result).toBeNull();
    });

    it('should return null when selectedItem is null', () => {
      mockDeps.hierarchyState.selectedItem = null;

      const result = utilities.findSelectedContext();

      expect(result).toBeNull();
    });

    it('should return null when context ID is not found', () => {
      mockDeps.hierarchyState.selectedItem = { type: 'context', id: 'nonexistent-context' };

      const result = utilities.findSelectedContext();

      expect(result).toBeNull();
    });
  });

  describe('findSelectedSchema', () => {
    it('should return selected schema when selectedItem is a schema', () => {
      mockDeps.hierarchyState.selectedItem = { type: 'schema', id: 'schema-1' };

      const result = utilities.findSelectedSchema();

      expect(result).toEqual({
        id: 'schema-1',
        name: 'Test Schema 1',
        schemaTypeCategory: 'event'
      });
    });

    it('should return schema from second product', () => {
      mockDeps.hierarchyState.selectedItem = { type: 'schema', id: 'schema-2' };

      const result = utilities.findSelectedSchema();

      expect(result).toEqual({
        id: 'schema-2',
        name: 'Test Schema 2',
        schemaTypeCategory: 'command'
      });
    });

    it('should return null when selectedItem is not a schema', () => {
      mockDeps.hierarchyState.selectedItem = { type: 'context', id: 'context-1' };

      const result = utilities.findSelectedSchema();

      expect(result).toBeNull();
    });

    it('should return null when selectedItem is null', () => {
      mockDeps.hierarchyState.selectedItem = null;

      const result = utilities.findSelectedSchema();

      expect(result).toBeNull();
    });

    it('should return null when schema ID is not found', () => {
      mockDeps.hierarchyState.selectedItem = { type: 'schema', id: 'nonexistent-schema' };

      const result = utilities.findSelectedSchema();

      expect(result).toBeNull();
    });
  });

  describe('cross-entity searches', () => {
    it('should handle multiple products with overlapping entity structures', () => {
      // Test that each utility function finds entities in the correct product
      mockDeps.hierarchyState.selectedItem = { type: 'domain', id: 'domain-1' };
      expect(utilities.findSelectedDomain()?.name).toBe('Test Domain 1');

      mockDeps.hierarchyState.selectedItem = { type: 'domain', id: 'domain-2' };
      expect(utilities.findSelectedDomain()?.name).toBe('Test Domain 2');

      mockDeps.hierarchyState.selectedItem = { type: 'context', id: 'context-1' };
      expect(utilities.findSelectedContext()?.name).toBe('Test Context 1');

      mockDeps.hierarchyState.selectedItem = { type: 'context', id: 'context-2' };
      expect(utilities.findSelectedContext()?.name).toBe('Test Context 2');

      mockDeps.hierarchyState.selectedItem = { type: 'schema', id: 'schema-1' };
      expect(utilities.findSelectedSchema()?.schemaTypeCategory).toBe('event');

      mockDeps.hierarchyState.selectedItem = { type: 'schema', id: 'schema-2' };
      expect(utilities.findSelectedSchema()?.schemaTypeCategory).toBe('command');
    });
  });
});