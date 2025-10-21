import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFormSubmissionHandlers } from '../../src/appEventHandlers/formSubmissionHandlers';
import { AppEventHandlerDependencies } from '../../src/appEventHandlers/types';
import { SchemaStatus, SchemaScope, SchemaTypeCategory } from '../../src/types/schema';

describe('Form Submission Handlers', () => {
  // Mock dependencies
  const mockDeps: AppEventHandlerDependencies = {
    // Registry operations
    registry: { products: [] },
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
    viewMode: 'tree',
    setViewMode: vi.fn(),

    // Selected/Current items state
    selectedSchema: null,
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

  describe('handleProductSubmit', () => {
    it('should create product with valid data', async () => {
      const productData = { name: 'New Product', description: 'Product description' };
      const newProductId = 'new-product-id';

      (mockDeps.addProduct as any).mockResolvedValue(newProductId);

      const handlers = createFormSubmissionHandlers(mockDeps);
      await handlers.handleProductSubmit(productData);

      // Verify product creation
      expect(mockDeps.addProduct).toHaveBeenCalledWith('New Product', 'Product description');

      // Verify real-time message
      expect(mockDeps.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'product_created',
          entityId: newProductId,
          entityType: 'product',
          data: productData
        })
      );

      // Verify tree expansion
      expect(mockDeps.hierarchyActions.setExpandedItems).toHaveBeenCalled();
      
      // Verify view mode change
      expect(mockDeps.setViewMode).toHaveBeenCalledWith('tree');

      // Verify success toast
      expect(mockDeps.showToastSuccess).toHaveBeenCalledWith('Product Created', '"New Product" has been created successfully');
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('API Error');
      (mockDeps.addProduct as any).mockRejectedValue(error);
      
      const handlers = createFormSubmissionHandlers(mockDeps);

      await handlers.handleProductSubmit({ name: 'Test', description: 'Desc' });

      expect(mockDeps.sendMessage).not.toHaveBeenCalled();
      expect(mockDeps.setViewMode).not.toHaveBeenCalled();

      // Verify error toast
      expect(mockDeps.showToastError).toHaveBeenCalledWith('Creation Failed', 'Failed to create product "Test"');
    });
  });

  describe('handleDomainSubmit', () => {
    it('should create domain with current product ID', async () => {
      const domainData = { name: 'New Domain', description: 'Domain description' };
      const newDomainId = 'new-domain-id';

      (mockDeps.addDomain as any).mockResolvedValue(newDomainId);
      
      const handlers = createFormSubmissionHandlers(mockDeps);

      await handlers.handleDomainSubmit(domainData);

      // Verify domain creation with current product ID
      expect(mockDeps.addDomain).toHaveBeenCalledWith(
        'product-123', 
        'New Domain', 
        'Domain description'
      );

      // Verify real-time message
      expect(mockDeps.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'domain_created',
          entityId: newDomainId,
          entityType: 'domain',
          data: domainData
        })
      );

      // Verify tree expansion includes both product and domain
      expect(mockDeps.hierarchyActions.setExpandedItems).toHaveBeenCalledWith(
        expect.any(Function)
      );
      
      expect(mockDeps.setViewMode).toHaveBeenCalledWith('tree');
    });
  });

  describe('handleContextSubmit', () => {
    it('should create context and expand parent hierarchy', async () => {
      const contextData = { name: 'New Context', description: 'Context description' };
      const newContextId = 'new-context-id';

      (mockDeps.addContext as any).mockResolvedValue(newContextId);

      const handlers = createFormSubmissionHandlers({
        ...mockDeps,
        sortedRegistry: {
          products: [
            {
              id: 'product-123',
              name: 'Test Product',
              domains: [
                { 
                  id: 'domain-123', 
                  name: 'Test Domain',
                  contexts: []
                }
              ]
            }
          ]
        }
      });

      await handlers.handleContextSubmit(contextData);

      // Verify context creation with current domain ID
      expect(mockDeps.addContext).toHaveBeenCalledWith(
        'domain-123', 
        'New Context',
        undefined,
        'Context description'
      );

      // Verify expansion includes product, domain, and context
      const expandCall = mockDeps.hierarchyActions.setExpandedItems.mock.calls[0][0];
      const expandedSet = expandCall(new Set());
      expect(expandedSet.has('product-123')).toBe(true);
      expect(expandedSet.has('domain-123')).toBe(true);
      expect(expandedSet.has(newContextId)).toBe(true);
    });
  });

  describe('handleSchemaSubmit', () => {
    it('should create schema and expand full hierarchy including category', async () => {
      const schemaData = {
        name: 'UserCreated',
        description: 'User creation event',
        schemaTypeCategory: SchemaTypeCategory.Events,
        scope: SchemaScope.Public,
        contextId: 'context-123',
        versions: []
      };
      const newSchemaId = 'new-schema-id';

      (mockDeps.addSchema as any).mockResolvedValue(newSchemaId);

      const handlers = createFormSubmissionHandlers({
        ...mockDeps,
        sortedRegistry: {
          products: [
            {
              id: 'product-123',
              name: 'Test Product',
              domains: [
                {
                  id: 'domain-123',
                  name: 'Test Domain',
                  contexts: [
                    {
                      id: 'context-123',
                      name: 'Test Context',
                      schemas: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      });

      await handlers.handleSchemaSubmit(schemaData);

      // Verify schema creation
      expect(mockDeps.addSchema).toHaveBeenCalledWith('context-123', schemaData);

      // Verify real-time message
      expect(mockDeps.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'schema_created',
          entityId: newSchemaId,
          entityType: 'schema',
          data: schemaData
        })
      );

      // Verify expansion includes full hierarchy plus category
      const expandCall = mockDeps.hierarchyActions.setExpandedItems.mock.calls[0][0];
      const expandedSet = expandCall(new Set());
      expect(expandedSet.has('product-123')).toBe(true);
      expect(expandedSet.has('domain-123')).toBe(true);
      expect(expandedSet.has('context-123')).toBe(true);
      expect(expandedSet.has(`context-123-${SchemaTypeCategory.Events}`)).toBe(true);
      expect(expandedSet.has(newSchemaId)).toBe(true);

      // Verify preselected category is cleared
      expect(mockDeps.setPreselectedCategory).toHaveBeenCalledWith(undefined);
    });
  });

  describe('handleVersionSubmit', () => {
    it('should not create version when no schema is selected', async () => {
      const handlers = createFormSubmissionHandlers(mockDeps);
      
      const versionData = {
        semanticVersion: '1.0.0',
        specification: 'event UserCreated { id: string }',
        description: 'Initial version',
        status: SchemaStatus.Draft,
        schemaId: ''
      };

      await handlers.handleVersionSubmit(versionData);

      expect(mockDeps.addSchemaVersion).not.toHaveBeenCalled();
      expect(mockDeps.sendMessage).not.toHaveBeenCalled();
    });

    it('should create version and update selected schema', async () => {
      const selectedSchema = {
        id: 'schema-123',
        name: 'UserCreated',
        schemaTypeCategory: SchemaTypeCategory.Events,
        versions: []
      };

      const updatedSchema = {
        ...selectedSchema,
        versions: [
          {
            id: 'version-123',
            semanticVersion: '1.0.0',
            specification: 'event UserCreated { id: string }',
            status: SchemaStatus.Draft
          }
        ]
      };

      const handlers = createFormSubmissionHandlers({
        ...mockDeps,
        selectedSchema,
        registry: {
          products: [
            {
              id: 'product-123',
              name: 'Test Product',
              domains: [
                {
                  id: 'domain-123',
                  name: 'Test Domain',
                  contexts: [
                    {
                      id: 'context-123',
                      name: 'Test Context',
                      schemas: [updatedSchema]
                    }
                  ]
                }
              ]
            }
          ]
        }
      });

      const versionData = {
        semanticVersion: '1.0.0',
        specification: 'event UserCreated { id: string }',
        description: 'Initial version',
        status: SchemaStatus.Draft,
        schemaId: 'schema-123'
      };

      (mockDeps.addSchemaVersion as any).mockResolvedValue('version-123');

      await handlers.handleVersionSubmit(versionData);

      // Verify version creation
      expect(mockDeps.addSchemaVersion).toHaveBeenCalledWith('schema-123', versionData);

      // Verify real-time message
      expect(mockDeps.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'schema_version_created',
          entityId: 'schema-123',
          entityType: 'schema_version',
          data: versionData
        })
      );

      // Verify schema and version selection update
      expect(mockDeps.setSelectedSchema).toHaveBeenCalledWith(updatedSchema);
      expect(mockDeps.setSelectedVersion).toHaveBeenCalledWith(
        expect.objectContaining({ semanticVersion: '1.0.0' })
      );

      // Verify hierarchy expansion
      expect(mockDeps.hierarchyActions.setExpandedItems).toHaveBeenCalled();
    });
  });
});