import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNavigationHandlers } from '../../src/appEventHandlers/navigationHandlers';
import { AppEventHandlerDependencies } from '../../src/appEventHandlers/types';
import { SchemaStatus, SchemaScope, SchemaTypeCategory } from '../../src/types/schema';

// Mock HierarchyFinder
vi.mock('../../src/components/hierarchy/tools/hierarchyFinder', () => ({
  HierarchyFinder: {
    findDomain: vi.fn(),
    findProductByDomainId: vi.fn(),
    findSchema: vi.fn()
  }
}));

describe('Navigation Handlers', () => {
  const mockDeps: AppEventHandlerDependencies = {
    // Registry operations
    registry: { products: [] },
    sortedRegistry: {
      products: [
        {
          id: 'product-1',
          name: 'Test Product',
          description: 'A test product',
          domains: [
            {
              id: 'domain-1',
              name: 'Test Domain',
              description: 'A test domain',
              contexts: [
                {
                  id: 'context-1',
                  name: 'Test Context',
                  description: 'A test context',
                  schemas: [
                    {
                      id: 'schema-1',
                      name: 'UserCreated',
                      description: 'User creation event',
                      schemaTypeCategory: SchemaTypeCategory.Events,
                      scope: SchemaScope.Public,
                      versions: [
                        {
                          id: 'version-1',
                          semanticVersion: '1.0.0',
                          specification: 'event UserCreated { id: string }',
                          description: 'Initial version',
                          status: SchemaStatus.Draft
                        }
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
    tenantInfo: { tenantId: 'test-tenant', registryId: 'test-registry', baseUrl: '' },
    addProduct: vi.fn(),
    addDomain: vi.fn(),
    addContext: vi.fn(),
    addSchema: vi.fn(),
    addSchemaVersion: vi.fn(),
    updateProduct: vi.fn(),
    updateDomain: vi.fn(),
    updateContext: vi.fn(),
    updateSchema: vi.fn(),
    updateSchemaVersion: vi.fn(),
    reload: vi.fn(),

    // Real-time messaging
    sendMessage: vi.fn(),
    isConnected: true,

    // View state
    viewMode: 'tree',
    setViewMode: vi.fn(),

    // Selected/Current items state
    selectedSchema: null,
    setSelectedSchema: vi.fn(),
    selectedVersion: null,
    setSelectedVersion: vi.fn(),
    currentContextId: '',
    setCurrentContextId: vi.fn(),
    currentProductId: '',
    setCurrentProductId: vi.fn(),
    currentDomainId: '',
    setCurrentDomainId: vi.fn(),
    currentProductName: '',
    setCurrentProductName: vi.fn(),
    currentDomainName: '',
    setCurrentDomainName: vi.fn(),
    preselectedCategory: undefined,
    setPreselectedCategory: vi.fn(),

    // Editing state
    editingProduct: null,
    setEditingProduct: vi.fn(),
    editingDomain: null,
    setEditingDomain: vi.fn(),
    editingContext: null,
    setEditingContext: vi.fn(),
    editingSchema: null,
    setEditingSchema: vi.fn(),
    editingVersion: null,
    setEditingVersion: vi.fn(),

    // Find modal state
    isFindOpen: false,
    setIsFindOpen: vi.fn(),
    findQuery: '',
    setFindQuery: vi.fn(),
    findResults: [],
    setFindResults: vi.fn(),

    // Filter state
    isFilterOpen: false,
    setIsFilterOpen: vi.fn(),
    filterMousePosition: undefined,
    setFilterMousePosition: vi.fn(),
    statusFilter: {
      [SchemaStatus.Draft]: true,
      [SchemaStatus.Published]: true,
      [SchemaStatus.Deprecated]: true,
      [SchemaStatus.Removed]: true
    },
    setStatusFilter: vi.fn(),

    // Hierarchy tree state and actions
    hierarchyState: {
      expandedItems: new Set<string>(),
      selectedItem: null,
      pinnedItem: null
    },
    hierarchyActions: {
      setExpandedItems: vi.fn(),
      setSelectedItem: vi.fn(),
      setPinnedItem: vi.fn()
    },
    hierarchyStateHandlers: {},
    hierarchyCallbacks: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleSchemaSelect', () => {
    it('should select schema and version for editing', () => {
      const handlers = createNavigationHandlers(mockDeps);
      const schema = mockDeps.sortedRegistry.products[0].domains[0].contexts[0].schemas[0];
      const version = schema.versions[0];

      handlers.handleSchemaSelect(schema, version);

      expect(mockDeps.setSelectedSchema).toHaveBeenCalledWith(schema);
      expect(mockDeps.setEditingVersion).toHaveBeenCalledWith(version);
      expect(mockDeps.hierarchyActions.setSelectedItem).toHaveBeenCalledWith({
        type: 'version',
        id: 'version-1'
      });
      expect(mockDeps.setViewMode).toHaveBeenCalledWith('edit-version');
    });
  });

  describe('handleCreateDomain', () => {
    it('should set up domain creation with product context', () => {
      const handlers = createNavigationHandlers(mockDeps);

      handlers.handleCreateDomain('product-1');

      expect(mockDeps.setCurrentProductId).toHaveBeenCalledWith('product-1');
      expect(mockDeps.setCurrentProductName).toHaveBeenCalledWith('Test Product');
      expect(mockDeps.setViewMode).toHaveBeenCalledWith('create-domain');
    });

    it('should handle missing product gracefully', () => {
      const handlers = createNavigationHandlers(mockDeps);

      handlers.handleCreateDomain('non-existent-product');

      expect(mockDeps.setCurrentProductId).toHaveBeenCalledWith('non-existent-product');
      expect(mockDeps.setCurrentProductName).toHaveBeenCalledWith('');
      expect(mockDeps.setViewMode).toHaveBeenCalledWith('create-domain');
    });
  });

  describe('handleCreateContext', () => {
    it('should set up context creation with domain and product context', async () => {
      const { HierarchyFinder } = await import('../../src/components/hierarchy/tools/hierarchyFinder');
      
      // Mock the HierarchyFinder methods
      (HierarchyFinder.findDomain as any).mockReturnValue({
        id: 'domain-1',
        name: 'Test Domain'
      });
      (HierarchyFinder.findProductByDomainId as any).mockReturnValue({
        id: 'product-1',
        name: 'Test Product'
      });

      const handlers = createNavigationHandlers(mockDeps);

      handlers.handleCreateContext('domain-1');

      expect(HierarchyFinder.findDomain).toHaveBeenCalledWith(
        mockDeps.sortedRegistry.products,
        'domain-1'
      );
      expect(HierarchyFinder.findProductByDomainId).toHaveBeenCalledWith(
        mockDeps.sortedRegistry.products,
        'domain-1'
      );
      expect(mockDeps.setCurrentDomainId).toHaveBeenCalledWith('domain-1');
      expect(mockDeps.setCurrentDomainName).toHaveBeenCalledWith('Test Domain');
      expect(mockDeps.setCurrentProductName).toHaveBeenCalledWith('Test Product');
      expect(mockDeps.setViewMode).toHaveBeenCalledWith('create-context');
    });

    it('should handle missing domain gracefully', async () => {
      const { HierarchyFinder } = await import('../../src/components/hierarchy/tools/hierarchyFinder');
      
      (HierarchyFinder.findDomain as any).mockReturnValue(null);
      (HierarchyFinder.findProductByDomainId as any).mockReturnValue(null);

      const handlers = createNavigationHandlers(mockDeps);

      handlers.handleCreateContext('non-existent-domain');

      expect(mockDeps.setCurrentDomainName).toHaveBeenCalledWith('');
      expect(mockDeps.setCurrentProductName).toHaveBeenCalledWith('');
    });
  });

  describe('handleCreateSchema', () => {
    it('should set up schema creation with context and category', () => {
      const handlers = createNavigationHandlers(mockDeps);

      handlers.handleCreateSchema('context-1', SchemaTypeCategory.Events);

      expect(mockDeps.setCurrentContextId).toHaveBeenCalledWith('context-1');
      expect(mockDeps.setPreselectedCategory).toHaveBeenCalledWith(SchemaTypeCategory.Events);
      expect(mockDeps.setViewMode).toHaveBeenCalledWith('create-schema');
    });

    it('should handle schema creation without category', () => {
      const handlers = createNavigationHandlers(mockDeps);

      handlers.handleCreateSchema('context-1');

      expect(mockDeps.setCurrentContextId).toHaveBeenCalledWith('context-1');
      expect(mockDeps.setPreselectedCategory).toHaveBeenCalledWith(undefined);
      expect(mockDeps.setViewMode).toHaveBeenCalledWith('create-schema');
    });
  });

  describe('handleCreateSchemaVersion', () => {
    it('should set up schema version creation', () => {
      const handlers = createNavigationHandlers(mockDeps);
      const schema = mockDeps.sortedRegistry.products[0].domains[0].contexts[0].schemas[0];

      handlers.handleCreateSchemaVersion(schema);

      expect(mockDeps.setSelectedSchema).toHaveBeenCalledWith(schema);
      expect(mockDeps.setSelectedVersion).toHaveBeenCalledWith(null);
      expect(mockDeps.setViewMode).toHaveBeenCalledWith('create-version');
    });
  });

  describe('handleEditProduct', () => {
    it('should set up product editing', () => {
      const handlers = createNavigationHandlers(mockDeps);
      const product = mockDeps.sortedRegistry.products[0];

      handlers.handleEditProduct(product);

      expect(mockDeps.setEditingProduct).toHaveBeenCalledWith(product);
      expect(mockDeps.setViewMode).toHaveBeenCalledWith('edit-product');
    });
  });

  describe('handleEditDomain', () => {
    it('should set up domain editing', () => {
      const handlers = createNavigationHandlers(mockDeps);
      const domain = mockDeps.sortedRegistry.products[0].domains[0];

      handlers.handleEditDomain(domain);

      expect(mockDeps.setEditingDomain).toHaveBeenCalledWith(domain);
      expect(mockDeps.setViewMode).toHaveBeenCalledWith('edit-domain');
    });
  });

  describe('handleEditContext', () => {
    it('should set up context editing', () => {
      const handlers = createNavigationHandlers(mockDeps);
      const context = mockDeps.sortedRegistry.products[0].domains[0].contexts[0];

      handlers.handleEditContext(context);

      expect(mockDeps.setEditingContext).toHaveBeenCalledWith(context);
      expect(mockDeps.setViewMode).toHaveBeenCalledWith('edit-context');
    });
  });

  describe('handleEditSchema', () => {
    it('should set up schema editing', () => {
      const handlers = createNavigationHandlers(mockDeps);
      const schema = mockDeps.sortedRegistry.products[0].domains[0].contexts[0].schemas[0];

      handlers.handleEditSchema(schema);

      expect(mockDeps.setEditingSchema).toHaveBeenCalledWith(schema);
      expect(mockDeps.setViewMode).toHaveBeenCalledWith('edit-schema');
    });
  });
});