import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createModalHandlers } from '../../src/appEventHandlers/modalHandlers';
import { AppEventHandlerDependencies } from '../../src/appEventHandlers/types';
import { FindResult } from '../../src/components/FindModal';
import { StatusFilter } from '../../src/components/FilterModal';
import { apiClient } from '../../src/services/apiClient';

// Mock the API client
vi.mock('../../src/services/apiClient', () => ({
  apiClient: {
    find: vi.fn()
  }
}));

describe('modalHandlers', () => {
  let mockDeps: AppEventHandlerDependencies;
  let handlers: ReturnType<typeof createModalHandlers>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDeps = {
      // Registry with test data
      registry: {
        products: [
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
                        schemaTypeCategory: 'event',
                        versions: [
                          { id: 'version-1', versionNumber: '1.0.0' }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      
      // Hierarchy state
      hierarchyState: {
        selectedItem: null,
        expandedItems: new Set(['product-1'])
      },
      
      // State setters
      setViewMode: vi.fn(),
      setSelectedSchema: vi.fn(),
      setEditingVersion: vi.fn(),
      setStatusFilter: vi.fn(),
      
      // Hierarchy actions
      hierarchyActions: {
        setExpandedItems: vi.fn(),
        setSelectedItem: vi.fn()
      }
    } as any;

    handlers = createModalHandlers(mockDeps);
  });

  describe('handleFindQuery', () => {
    it('should return search results from API', async () => {
      const mockResults: FindResult[] = [
        {
          entityId: 'schema-1',
          name: 'Test Schema',
          type: 'schema',
          parentIds: { productId: 'product-1', domainId: 'domain-1', contextId: 'context-1' }
        }
      ];

      (apiClient.find as any).mockResolvedValue({ results: mockResults });

      const results = await handlers.handleFindQuery('test query');

      expect(apiClient.find).toHaveBeenCalledWith('test query');
      expect(results).toEqual(mockResults);
    });

    it('should return empty array on API error', async () => {
      (apiClient.find as any).mockRejectedValue(new Error('API Error'));

      const results = await handlers.handleFindQuery('test query');

      expect(results).toEqual([]);
    });

    it('should return empty array when API returns no results', async () => {
      (apiClient.find as any).mockResolvedValue({ results: null });

      const results = await handlers.handleFindQuery('test query');

      expect(results).toEqual([]);
    });
  });

  describe('handleFindSelect', () => {
    it('should navigate to product result and expand hierarchy', () => {
      const result: FindResult = {
        entityId: 'product-1',
        name: 'Test Product',
        type: 'product',
        parentIds: { productId: 'product-1' }
      };

      handlers.handleFindSelect(result);

      expect(mockDeps.hierarchyActions.setExpandedItems).toHaveBeenCalledWith(
        new Set(['product-1'])
      );
      expect(mockDeps.hierarchyActions.setSelectedItem).toHaveBeenCalledWith({
        type: 'product',
        id: 'product-1'
      });
      expect(mockDeps.setViewMode).toHaveBeenCalledWith('tree');
    });

    it('should navigate to domain result and expand hierarchy', () => {
      const result: FindResult = {
        entityId: 'domain-1',
        name: 'Test Domain',
        type: 'domain',
        parentIds: { productId: 'product-1', domainId: 'domain-1' }
      };

      handlers.handleFindSelect(result);

      expect(mockDeps.hierarchyActions.setExpandedItems).toHaveBeenCalledWith(
        new Set(['product-1', 'domain-1'])
      );
      expect(mockDeps.hierarchyActions.setSelectedItem).toHaveBeenCalledWith({
        type: 'domain',
        id: 'domain-1'
      });
    });

    it('should navigate to schema result and expand hierarchy with category', () => {
      const result: FindResult = {
        entityId: 'schema-1',
        name: 'Test Schema',
        type: 'schema',
        parentIds: { 
          productId: 'product-1', 
          domainId: 'domain-1', 
          contextId: 'context-1' 
        }
      };

      handlers.handleFindSelect(result);

      const expectedExpansions = new Set([
        'product-1',
        'domain-1',
        'context-1',
        'context-1-event' // category expansion
      ]);

      expect(mockDeps.hierarchyActions.setExpandedItems).toHaveBeenCalledWith(expectedExpansions);
      expect(mockDeps.hierarchyActions.setSelectedItem).toHaveBeenCalledWith({
        type: 'schema',
        id: 'schema-1'
      });
    });

    it('should navigate to version result and switch to edit mode', () => {
      const result: FindResult = {
        entityId: 'version-1',
        name: '1.0.0',
        type: 'version',
        parentIds: { 
          productId: 'product-1', 
          domainId: 'domain-1', 
          contextId: 'context-1',
          schemaId: 'schema-1'
        }
      };

      handlers.handleFindSelect(result);

      const expectedExpansions = new Set([
        'product-1',
        'domain-1', 
        'context-1',
        'context-1-event', // category expansion
        'schema-1'
      ]);

      expect(mockDeps.hierarchyActions.setExpandedItems).toHaveBeenCalledWith(expectedExpansions);
      expect(mockDeps.hierarchyActions.setSelectedItem).toHaveBeenCalledWith({
        type: 'version',
        id: 'version-1'
      });
      expect(mockDeps.setSelectedSchema).toHaveBeenCalledWith(mockDeps.registry.products[0].domains[0].contexts[0].schemas[0]);
      expect(mockDeps.setEditingVersion).toHaveBeenCalledWith({ id: 'version-1', versionNumber: '1.0.0' });
      expect(mockDeps.setViewMode).toHaveBeenCalledWith('edit-version');
    });

    it('should handle version result when schema not found', () => {
      const result: FindResult = {
        entityId: 'version-1',
        name: '1.0.0',
        type: 'version',
        parentIds: { 
          productId: 'product-1', 
          domainId: 'domain-1', 
          contextId: 'context-1',
          schemaId: 'nonexistent-schema'
        }
      };

      handlers.handleFindSelect(result);

      // Should still set the selected item but not switch to edit mode
      expect(mockDeps.hierarchyActions.setSelectedItem).toHaveBeenCalledWith({
        type: 'version',
        id: 'version-1'
      });
      expect(mockDeps.setSelectedSchema).not.toHaveBeenCalled();
      expect(mockDeps.setEditingVersion).not.toHaveBeenCalled();
    });

    it('should preserve existing expansions when adding new ones', () => {
      mockDeps.hierarchyState.expandedItems = new Set(['existing-item']);

      const result: FindResult = {
        entityId: 'product-1',
        name: 'Test Product',
        type: 'product',
        parentIds: { productId: 'product-1' }
      };

      handlers.handleFindSelect(result);

      expect(mockDeps.hierarchyActions.setExpandedItems).toHaveBeenCalledWith(
        new Set(['existing-item', 'product-1'])
      );
    });
  });

  describe('handleFilterApply', () => {
    it('should apply status filter', () => {
      const filter: StatusFilter = { status: 'active' };

      handlers.handleFilterApply(filter);

      expect(mockDeps.setStatusFilter).toHaveBeenCalledWith(filter);
    });

    it('should handle empty filter', () => {
      const filter: StatusFilter = {};

      handlers.handleFilterApply(filter);

      expect(mockDeps.setStatusFilter).toHaveBeenCalledWith(filter);
    });
  });
});