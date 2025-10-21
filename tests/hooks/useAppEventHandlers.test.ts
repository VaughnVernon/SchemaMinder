import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppEventHandlers } from '../../src/hooks/useAppEventHandlers';
import { AppEventHandlerDependencies } from '../../src/appEventHandlers/types';

// Mock all the handler modules
vi.mock('../../src/appEventHandlers/formSubmissionHandlers', () => ({
  createFormSubmissionHandlers: vi.fn()
}));

vi.mock('../../src/appEventHandlers/formEditHandlers', () => ({
  createFormEditHandlers: vi.fn()
}));

vi.mock('../../src/appEventHandlers/navigationHandlers', () => ({
  createNavigationHandlers: vi.fn()
}));

vi.mock('../../src/appEventHandlers/modalHandlers', () => ({
  createModalHandlers: vi.fn()
}));

vi.mock('../../src/appEventHandlers/utilityHandlers', () => ({
  createUtilityFunctions: vi.fn()
}));

describe('useAppEventHandlers', () => {
  let mockDeps: AppEventHandlerDependencies;
  let mockFormSubmissionHandlers: any;
  let mockFormEditHandlers: any;
  let mockNavigationHandlers: any;
  let mockModalHandlers: any;
  let mockUtilityFunctions: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mock dependencies
    mockDeps = {
      // Registry
      registry: {
        products: [
          {
            id: 'product-1',
            name: 'Test Product',
            domains: []
          }
        ]
      },
      
      // Hierarchy state
      hierarchyState: {
        selectedItem: null,
        expandedItems: new Set()
      },
      
      // Editing states
      editingProduct: null,
      editingDomain: null,
      editingContext: null,
      editingSchema: null,
      editingVersion: null,
      
      // Current IDs
      currentProductId: null,
      currentDomainId: null,
      currentContextId: null,
      currentSchemaId: null,
      
      // Current names
      currentProductName: '',
      currentDomainName: '',
      currentContextName: '',
      currentSchemaName: '',
      
      // Status filter
      statusFilter: {},
      
      // Registry operations
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
      
      // State setters
      setViewMode: vi.fn(),
      setCurrentProductId: vi.fn(),
      setCurrentDomainId: vi.fn(),
      setCurrentContextId: vi.fn(),
      setCurrentSchemaId: vi.fn(),
      setCurrentProductName: vi.fn(),
      setCurrentDomainName: vi.fn(),
      setCurrentContextName: vi.fn(),
      setCurrentSchemaName: vi.fn(),
      setEditingProduct: vi.fn(),
      setEditingDomain: vi.fn(),
      setEditingContext: vi.fn(),
      setEditingSchema: vi.fn(),
      setEditingVersion: vi.fn(),
      setSelectedSchema: vi.fn(),
      setStatusFilter: vi.fn(),
      
      // Hierarchy actions
      hierarchyActions: {
        setExpandedItems: vi.fn(),
        setSelectedItem: vi.fn()
      },
      
      // Real-time messaging
      sendMessage: vi.fn(),
      
      // Modal functions
      showFindModal: vi.fn(),
      showFilterModal: vi.fn(),
      showMessageModal: vi.fn(),
      
      // Utility functions
      getSelectedProduct: vi.fn(),
      getSelectedDomain: vi.fn(),
      getSelectedContext: vi.fn(),
      getSelectedSchema: vi.fn()
    } as any;

    // Setup mock handler return values
    mockFormSubmissionHandlers = {
      handleProductSubmit: vi.fn(),
      handleDomainSubmit: vi.fn(),
      handleContextSubmit: vi.fn(),
      handleSchemaSubmit: vi.fn(),
      handleVersionSubmit: vi.fn()
    };

    mockFormEditHandlers = {
      handleProductEditSubmit: vi.fn(),
      handleDomainEditSubmit: vi.fn(),
      handleContextEditSubmit: vi.fn(),
      handleSchemaEditSubmit: vi.fn(),
      handleVersionEditSubmit: vi.fn()
    };

    mockNavigationHandlers = {
      handleCreateProduct: vi.fn(),
      handleCreateDomain: vi.fn(),
      handleCreateContext: vi.fn(),
      handleCreateSchema: vi.fn(),
      handleCreateVersion: vi.fn(),
      handleEditProduct: vi.fn(),
      handleEditDomain: vi.fn(),
      handleEditContext: vi.fn(),
      handleEditSchema: vi.fn()
    };

    mockModalHandlers = {
      handleFindQuery: vi.fn(),
      handleFindSelect: vi.fn(),
      handleFilterApply: vi.fn()
    };

    mockUtilityFunctions = {
      findSelectedProduct: vi.fn(),
      findSelectedDomain: vi.fn(),
      findSelectedContext: vi.fn(),
      findSelectedSchema: vi.fn()
    };

    // Configure the mocked modules to return our mock handlers
    const { createFormSubmissionHandlers } = await import('../../src/appEventHandlers/formSubmissionHandlers');
    const { createFormEditHandlers } = await import('../../src/appEventHandlers/formEditHandlers');
    const { createNavigationHandlers } = await import('../../src/appEventHandlers/navigationHandlers');
    const { createModalHandlers } = await import('../../src/appEventHandlers/modalHandlers');
    const { createUtilityFunctions } = await import('../../src/appEventHandlers/utilityHandlers');

    (createFormSubmissionHandlers as any).mockReturnValue(mockFormSubmissionHandlers);
    (createFormEditHandlers as any).mockReturnValue(mockFormEditHandlers);
    (createNavigationHandlers as any).mockReturnValue(mockNavigationHandlers);
    (createModalHandlers as any).mockReturnValue(mockModalHandlers);
    (createUtilityFunctions as any).mockReturnValue(mockUtilityFunctions);
  });

  it('should create and combine all handler groups', async () => {
    const { result } = renderHook(() => useAppEventHandlers(mockDeps));

    const handlers = result.current;

    // Verify all handler groups are included
    expect(handlers.handleProductSubmit).toBe(mockFormSubmissionHandlers.handleProductSubmit);
    expect(handlers.handleDomainSubmit).toBe(mockFormSubmissionHandlers.handleDomainSubmit);
    expect(handlers.handleContextSubmit).toBe(mockFormSubmissionHandlers.handleContextSubmit);
    expect(handlers.handleSchemaSubmit).toBe(mockFormSubmissionHandlers.handleSchemaSubmit);
    expect(handlers.handleVersionSubmit).toBe(mockFormSubmissionHandlers.handleVersionSubmit);

    expect(handlers.handleProductEditSubmit).toBe(mockFormEditHandlers.handleProductEditSubmit);
    expect(handlers.handleDomainEditSubmit).toBe(mockFormEditHandlers.handleDomainEditSubmit);
    expect(handlers.handleContextEditSubmit).toBe(mockFormEditHandlers.handleContextEditSubmit);
    expect(handlers.handleSchemaEditSubmit).toBe(mockFormEditHandlers.handleSchemaEditSubmit);
    expect(handlers.handleVersionEditSubmit).toBe(mockFormEditHandlers.handleVersionEditSubmit);

    expect(handlers.handleCreateProduct).toBe(mockNavigationHandlers.handleCreateProduct);
    expect(handlers.handleCreateDomain).toBe(mockNavigationHandlers.handleCreateDomain);
    expect(handlers.handleCreateContext).toBe(mockNavigationHandlers.handleCreateContext);
    expect(handlers.handleCreateSchema).toBe(mockNavigationHandlers.handleCreateSchema);
    expect(handlers.handleCreateVersion).toBe(mockNavigationHandlers.handleCreateVersion);
    expect(handlers.handleEditProduct).toBe(mockNavigationHandlers.handleEditProduct);
    expect(handlers.handleEditDomain).toBe(mockNavigationHandlers.handleEditDomain);
    expect(handlers.handleEditContext).toBe(mockNavigationHandlers.handleEditContext);
    expect(handlers.handleEditSchema).toBe(mockNavigationHandlers.handleEditSchema);

    expect(handlers.handleFindQuery).toBe(mockModalHandlers.handleFindQuery);
    expect(handlers.handleFindSelect).toBe(mockModalHandlers.handleFindSelect);
    expect(handlers.handleFilterApply).toBe(mockModalHandlers.handleFilterApply);

    expect(handlers.findSelectedProduct).toBe(mockUtilityFunctions.findSelectedProduct);
    expect(handlers.findSelectedDomain).toBe(mockUtilityFunctions.findSelectedDomain);
    expect(handlers.findSelectedContext).toBe(mockUtilityFunctions.findSelectedContext);
    expect(handlers.findSelectedSchema).toBe(mockUtilityFunctions.findSelectedSchema);
  });

  it('should call all handler creator functions with dependencies', async () => {
    const { createFormSubmissionHandlers } = await import('../../src/appEventHandlers/formSubmissionHandlers');
    const { createFormEditHandlers } = await import('../../src/appEventHandlers/formEditHandlers');
    const { createNavigationHandlers } = await import('../../src/appEventHandlers/navigationHandlers');
    const { createModalHandlers } = await import('../../src/appEventHandlers/modalHandlers');
    const { createUtilityFunctions } = await import('../../src/appEventHandlers/utilityHandlers');

    renderHook(() => useAppEventHandlers(mockDeps));

    expect(createFormSubmissionHandlers).toHaveBeenCalledWith(mockDeps);
    expect(createFormEditHandlers).toHaveBeenCalledWith(mockDeps);
    expect(createNavigationHandlers).toHaveBeenCalledWith(mockDeps);
    expect(createModalHandlers).toHaveBeenCalledWith(mockDeps);
    expect(createUtilityFunctions).toHaveBeenCalledWith(mockDeps);
  });

  it('should memoize handlers and only recreate when dependencies change', async () => {
    const { rerender, result } = renderHook(
      ({ deps }) => useAppEventHandlers(deps),
      { initialProps: { deps: mockDeps } }
    );

    const initialHandlers = result.current;

    // Rerender with same dependencies
    rerender({ deps: mockDeps });
    expect(result.current).toBe(initialHandlers);

    // Rerender with changed registry
    const newDeps = {
      ...mockDeps,
      registry: {
        products: [
          {
            id: 'product-2',
            name: 'Different Product',
            domains: []
          }
        ]
      }
    };

    rerender({ deps: newDeps });
    expect(result.current).not.toBe(initialHandlers);
  });

  it('should recreate handlers when hierarchy state changes', async () => {
    const { rerender, result } = renderHook(
      ({ deps }) => useAppEventHandlers(deps),
      { initialProps: { deps: mockDeps } }
    );

    const initialHandlers = result.current;

    // Change hierarchy state
    const newDeps = {
      ...mockDeps,
      hierarchyState: {
        selectedItem: { type: 'product', id: 'product-1' },
        expandedItems: new Set(['product-1'])
      }
    };

    rerender({ deps: newDeps });
    expect(result.current).not.toBe(initialHandlers);
  });

  it('should recreate handlers when editing states change', async () => {
    const { rerender, result } = renderHook(
      ({ deps }) => useAppEventHandlers(deps),
      { initialProps: { deps: mockDeps } }
    );

    const initialHandlers = result.current;

    // Change editing state
    const newDeps = {
      ...mockDeps,
      editingProduct: { id: 'product-1', name: 'Test Product' }
    };

    rerender({ deps: newDeps });
    expect(result.current).not.toBe(initialHandlers);
  });

  it('should recreate handlers when registry operations change', async () => {
    const { rerender, result } = renderHook(
      ({ deps }) => useAppEventHandlers(deps),
      { initialProps: { deps: mockDeps } }
    );

    const initialHandlers = result.current;

    // Change registry operations
    const newDeps = {
      ...mockDeps,
      addProduct: vi.fn() // Different function reference
    };

    rerender({ deps: newDeps });
    expect(result.current).not.toBe(initialHandlers);
  });

  it('should recreate handlers when state setters change', async () => {
    const { rerender, result } = renderHook(
      ({ deps }) => useAppEventHandlers(deps),
      { initialProps: { deps: mockDeps } }
    );

    const initialHandlers = result.current;

    // Change state setter
    const newDeps = {
      ...mockDeps,
      setViewMode: vi.fn() // Different function reference
    };

    rerender({ deps: newDeps });
    expect(result.current).not.toBe(initialHandlers);
  });

  it('should recreate handlers when hierarchy actions change', async () => {
    const { rerender, result } = renderHook(
      ({ deps }) => useAppEventHandlers(deps),
      { initialProps: { deps: mockDeps } }
    );

    const initialHandlers = result.current;

    // Change hierarchy actions
    const newDeps = {
      ...mockDeps,
      hierarchyActions: {
        setExpandedItems: vi.fn(), // Different function reference
        setSelectedItem: vi.fn()
      }
    };

    rerender({ deps: newDeps });
    expect(result.current).not.toBe(initialHandlers);
  });
});