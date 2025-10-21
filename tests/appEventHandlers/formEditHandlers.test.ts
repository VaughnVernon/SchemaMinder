import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFormEditHandlers } from '../../src/appEventHandlers/formEditHandlers';
import { AppEventHandlerDependencies } from '../../src/appEventHandlers/types';
import { SchemaStatus, SchemaScope, SchemaTypeCategory } from '../../src/types/schema';

describe('Form Edit Handlers', () => {
  // Mock dependencies
  const mockDeps: AppEventHandlerDependencies = {
    // Registry operations
    registry: {
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
                      versions: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    sortedRegistry: { products: [] },
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
    viewMode: 'edit-product',
    setViewMode: vi.fn(),

    // Selected/Current items state
    selectedSchema: {
      id: 'schema-1',
      name: 'UserCreated',
      description: 'User creation event',
      schemaTypeCategory: SchemaTypeCategory.Events,
      scope: SchemaScope.Public,
      versions: []
    },
    setSelectedSchema: vi.fn(),
    selectedVersion: null,
    setSelectedVersion: vi.fn(),
    currentContextId: 'context-123',
    setCurrentContextId: vi.fn(),
    currentProductId: 'product-123',
    setCurrentProductId: vi.fn(),
    currentDomainId: 'domain-123',
    setCurrentDomainId: vi.fn(),
    currentProductName: 'Test Product',
    setCurrentProductName: vi.fn(),
    currentDomainName: 'Test Domain',
    setCurrentDomainName: vi.fn(),
    preselectedCategory: undefined,
    setPreselectedCategory: vi.fn(),

    // Editing state
    editingProduct: {
      id: 'product-1',
      name: 'Test Product',
      description: 'A test product',
      domains: []
    },
    setEditingProduct: vi.fn(),
    editingDomain: {
      id: 'domain-1',
      name: 'Test Domain',
      description: 'A test domain',
      contexts: []
    },
    setEditingDomain: vi.fn(),
    editingContext: {
      id: 'context-1',
      name: 'Test Context',
      description: 'A test context',
      schemas: []
    },
    setEditingContext: vi.fn(),
    editingSchema: {
      id: 'schema-1',
      name: 'UserCreated',
      description: 'User creation event',
      schemaTypeCategory: SchemaTypeCategory.Events,
      scope: SchemaScope.Public,
      versions: []
    },
    setEditingSchema: vi.fn(),
    editingVersion: {
      id: 'version-1',
      semanticVersion: '1.0.0',
      specification: 'event UserCreated { id: string }',
      description: 'Initial version',
      status: SchemaStatus.Draft
    },
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

    // Modal functions
    showFindModal: vi.fn(),
    showFilterModal: vi.fn(),
    showMessageModal: vi.fn(),

    // Toast notification functions
    showToastSuccess: vi.fn(),
    showToastError: vi.fn(),

    // Subscription state
    subscriptionState: {
      isSubscribed: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    },

    // Change notifications
    refreshChangeNotifications: vi.fn(),

    // Hierarchy tree state and actions
    hierarchyState: {
      expandedItems: new Set<string>(),
      selectedItem: { type: 'product', id: 'product-1' },
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

  describe('handleProductEditSubmit', () => {
    it('should update product using editingProduct', async () => {
      const handlers = createFormEditHandlers(mockDeps);
      const updates = { name: 'Updated Product', description: 'Updated description' };

      (mockDeps.updateProduct as any).mockResolvedValue(undefined);

      await handlers.handleProductEditSubmit(updates);

      // Verify product update
      expect(mockDeps.updateProduct).toHaveBeenCalledWith('product-1', updates);

      // Verify real-time message
      expect(mockDeps.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'product_updated',
          entityId: 'product-1',
          entityType: 'product',
          data: updates
        })
      );

      // Note: setViewMode('tree') is no longer called to keep forms open after save
    });

    it('should throw error when editingProduct is null (no longer supports findSelected fallback)', async () => {
      const handlers = createFormEditHandlers({
        ...mockDeps,
        editingProduct: null,
        hierarchyState: {
          ...mockDeps.hierarchyState,
          selectedItem: { type: 'product', id: 'product-1' }
        }
      });

      const updates = { name: 'Updated Product', description: 'Updated description' };

      await expect(handlers.handleProductEditSubmit(updates)).rejects.toThrow('No product selected for editing');
      expect(mockDeps.updateProduct).not.toHaveBeenCalled();
    });

    it('should throw error when no product is selected', async () => {
      const handlers = createFormEditHandlers({
        ...mockDeps,
        editingProduct: null,
        hierarchyState: {
          ...mockDeps.hierarchyState,
          selectedItem: null
        }
      });

      const updates = { name: 'Updated Product' };

      await expect(
        handlers.handleProductEditSubmit(updates)
      ).rejects.toThrow('No product selected for editing');

      expect(mockDeps.updateProduct).not.toHaveBeenCalled();
      expect(mockDeps.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const handlers = createFormEditHandlers(mockDeps);
      const error = new Error('API Error');
      (mockDeps.updateProduct as any).mockRejectedValue(error);

      await handlers.handleProductEditSubmit({ name: 'Updated Product' });

      // Verify error was logged and sendMessage was not called due to graceful error handling
      expect(mockDeps.sendMessage).not.toHaveBeenCalled();
      expect(mockDeps.setViewMode).not.toHaveBeenCalled();
    });
  });

  describe('handleDomainEditSubmit', () => {
    it('should update domain using editingDomain', async () => {
      const handlers = createFormEditHandlers(mockDeps);
      const updates = { name: 'Updated Domain', description: 'Updated domain description' };

      (mockDeps.updateDomain as any).mockResolvedValue(undefined);

      await handlers.handleDomainEditSubmit(updates);

      expect(mockDeps.updateDomain).toHaveBeenCalledWith('domain-1', updates);
      expect(mockDeps.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'domain_updated',
          entityId: 'domain-1',
          entityType: 'domain',
          data: updates
        })
      );
      // Note: setViewMode("tree") is no longer called to keep forms open after save
    });

    it('should throw error when editingDomain is null (no longer supports findSelected fallback)', async () => {
      const handlers = createFormEditHandlers({
        ...mockDeps,
        editingDomain: null,
        hierarchyState: {
          ...mockDeps.hierarchyState,
          selectedItem: { type: 'domain', id: 'domain-1' }
        }
      });

      const updates = { name: 'Updated Domain' };

      await expect(handlers.handleDomainEditSubmit(updates)).rejects.toThrow('No domain selected for editing');
      expect(mockDeps.updateDomain).not.toHaveBeenCalled();
    });
  });

  describe('handleContextEditSubmit', () => {
    it('should update context using editingContext', async () => {
      const handlers = createFormEditHandlers(mockDeps);
      const updates = { name: 'Updated Context', description: 'Updated context description' };

      (mockDeps.updateContext as any).mockResolvedValue(undefined);

      await handlers.handleContextEditSubmit(updates);

      expect(mockDeps.updateContext).toHaveBeenCalledWith('context-1', updates);
      expect(mockDeps.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'context_updated',
          entityId: 'context-1',
          entityType: 'context',
          data: updates
        })
      );
      // Note: setViewMode("tree") is no longer called to keep forms open after save
    });

    it('should throw error when editingContext is null (no longer supports findSelected fallback)', async () => {
      const handlers = createFormEditHandlers({
        ...mockDeps,
        editingContext: null,
        hierarchyState: {
          ...mockDeps.hierarchyState,
          selectedItem: { type: 'context', id: 'context-1' }
        }
      });

      const updates = { name: 'Updated Context' };

      await expect(handlers.handleContextEditSubmit(updates)).rejects.toThrow('No context selected for editing');
      expect(mockDeps.updateContext).not.toHaveBeenCalled();
    });
  });

  describe('handleSchemaEditSubmit', () => {
    it('should update schema with versions', async () => {
      const handlers = createFormEditHandlers(mockDeps);
      const schemaData = {
        name: 'UserUpdated',
        description: 'Updated user event',
        schemaTypeCategory: SchemaTypeCategory.Events,
        scope: SchemaScope.Public,
        contextId: 'context-1',
        versions: [
          {
            id: 'version-1',
            specification: 'event UserUpdated { id: string, name: string }',
            semanticVersion: '1.1.0',
            description: 'Updated version',
            status: SchemaStatus.Published
          }
        ]
      };

      (mockDeps.updateSchema as any).mockResolvedValue(undefined);

      await handlers.handleSchemaEditSubmit(schemaData);

      expect(mockDeps.updateSchema).toHaveBeenCalledWith('schema-1', {
        name: 'UserUpdated',
        description: 'Updated user event',
        schemaTypeCategory: SchemaTypeCategory.Events,
        scope: SchemaScope.Public,
        versions: [
          {
            versionId: 'version-1',
            specification: 'event UserUpdated { id: string, name: string }',
            semanticVersion: '1.1.0',
            description: 'Updated version',
            status: SchemaStatus.Published
          }
        ]
      });

      expect(mockDeps.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'schema_updated',
          entityId: 'schema-1',
          entityType: 'schema',
          data: schemaData
        })
      );
    });

    it('should update schema without versions', async () => {
      const handlers = createFormEditHandlers(mockDeps);
      const schemaData = {
        name: 'UserUpdated',
        description: 'Updated user event',
        schemaTypeCategory: SchemaTypeCategory.Events,
        scope: SchemaScope.Public,
        contextId: 'context-1',
        versions: []
      };

      (mockDeps.updateSchema as any).mockResolvedValue(undefined);

      await handlers.handleSchemaEditSubmit(schemaData);

      expect(mockDeps.updateSchema).toHaveBeenCalledWith('schema-1', {
        name: 'UserUpdated',
        description: 'Updated user event',
        schemaTypeCategory: SchemaTypeCategory.Events,
        scope: SchemaScope.Public
      });
    });

    it('should throw error when editingSchema is null (no longer supports findSelected fallback)', async () => {
      const handlers = createFormEditHandlers({
        ...mockDeps,
        editingSchema: null,
        hierarchyState: {
          ...mockDeps.hierarchyState,
          selectedItem: { type: 'schema', id: 'schema-1' }
        }
      });

      const schemaData = {
        name: 'UserUpdated',
        description: 'Updated user event',
        schemaTypeCategory: SchemaTypeCategory.Events,
        scope: SchemaScope.Public,
        contextId: 'context-1',
        versions: []
      };

      await expect(handlers.handleSchemaEditSubmit(schemaData)).rejects.toThrow('No schema selected for editing');
      expect(mockDeps.updateSchema).not.toHaveBeenCalled();
    });
  });

  describe('handleSchemaVersionEditSubmit', () => {
    it('should update schema version when both editingVersion and selectedSchema are present', async () => {
      const handlers = createFormEditHandlers(mockDeps);
      const updates = { description: 'Updated version description', status: SchemaStatus.Published };

      (mockDeps.updateSchemaVersion as any).mockResolvedValue(undefined);

      await handlers.handleSchemaVersionEditSubmit(updates);

      expect(mockDeps.updateSchemaVersion).toHaveBeenCalledWith(
        'schema-1',
        'version-1',
        updates
      );

      expect(mockDeps.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'schema_version_updated',
          entityId: 'version-1',
          entityType: 'schema_version',
          data: updates
        })
      );

      // Note: setViewMode("tree") is no longer called to keep forms open after save
    });

    it('should throw error when no version is selected', async () => {
      const handlers = createFormEditHandlers({
        ...mockDeps,
        editingVersion: null
      });

      const updates = { status: SchemaStatus.Published };

      await expect(
        handlers.handleSchemaVersionEditSubmit(updates)
      ).rejects.toThrow('No schema version selected for editing');

      expect(mockDeps.updateSchemaVersion).not.toHaveBeenCalled();
      expect(mockDeps.sendMessage).not.toHaveBeenCalled();
    });

    it('should throw error when no schema is selected', async () => {
      const handlers = createFormEditHandlers({
        ...mockDeps,
        selectedSchema: null
      });

      const updates = { status: SchemaStatus.Published };

      await expect(
        handlers.handleSchemaVersionEditSubmit(updates)
      ).rejects.toThrow('No schema version selected for editing');

      expect(mockDeps.updateSchemaVersion).not.toHaveBeenCalled();
    });
  });
});