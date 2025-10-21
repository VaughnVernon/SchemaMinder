import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useHierarchyHandlers } from '../../src/hooks/useHierarchyHandlers';
import { Schema, SchemaVersion, SchemaTypeCategory, SchemaStatus } from '../../src/types/schema';

describe('useHierarchyHandlers', () => {
  const mockHandlers = {
    handleEditProduct: vi.fn(),
    handleEditDomain: vi.fn(),
    handleEditContext: vi.fn(),
    handleEditSchema: vi.fn(),
    handleCreateDomain: vi.fn(),
    handleCreateContext: vi.fn(),
    handleCreateSchema: vi.fn(),
    handleCreateSchemaVersion: vi.fn()
  };

  const mockHierarchyActions = {
    setSelectedItem: vi.fn(),
    setPinnedItem: vi.fn()
  };

  const mockSetViewMode = vi.fn();
  const mockSetSelectedSchema = vi.fn();
  const mockSetEditingVersion = vi.fn();

  const mockSchema: Schema = {
    id: 'schema-1',
    name: 'Test Schema',
    schemaTypeCategory: SchemaTypeCategory.Events,
    versions: []
  };

  const mockVersion: SchemaVersion = {
    id: 'version-1',
    semanticVersion: '1.0.0',
    specification: 'test spec',
    status: SchemaStatus.Draft
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return hierarchy handlers object', () => {
    const { result } = renderHook(() => 
      useHierarchyHandlers({
        handlers: mockHandlers,
        hierarchyActions: mockHierarchyActions,
        setViewMode: mockSetViewMode,
        setSelectedSchema: mockSetSelectedSchema,
        setEditingVersion: mockSetEditingVersion
      })
    );

    expect(result.current).toHaveProperty('onItemSelect');
    expect(result.current).toHaveProperty('onEditProduct');
    expect(result.current).toHaveProperty('onEditDomain');
    expect(result.current).toHaveProperty('onEditContext');
    expect(result.current).toHaveProperty('onEditSchema');
    expect(result.current).toHaveProperty('onEditSchemaVersion');
    expect(result.current).toHaveProperty('onCreateProduct');
    expect(result.current).toHaveProperty('onCreateDomain');
    expect(result.current).toHaveProperty('onCreateContext');
    expect(result.current).toHaveProperty('onCreateSchema');
    expect(result.current).toHaveProperty('onCreateSchemaVersion');
    expect(result.current).toHaveProperty('onPinProduct');
    expect(result.current).toHaveProperty('onPinDomain');
    expect(result.current).toHaveProperty('onPinContext');
    expect(result.current).toHaveProperty('onUnpin');
    expect(result.current).toHaveProperty('onSchemaSelect');
  });

  it('should call direct edit handlers when onItemSelect is called (no longer sets selectedItem)', () => {
    const mockProduct = { id: 'product-1', name: 'Test Product', domains: [] };

    const { result } = renderHook(() =>
      useHierarchyHandlers({
        handlers: mockHandlers,
        hierarchyActions: mockHierarchyActions,
        setViewMode: mockSetViewMode,
        setSelectedSchema: mockSetSelectedSchema,
        setEditingVersion: mockSetEditingVersion
      })
    );

    // Test that onItemSelect calls the appropriate edit handler directly
    result.current.onItemSelect('product', 'product-1', mockProduct);
    expect(mockHandlers.handleEditProduct).toHaveBeenCalledWith(mockProduct);

    // Verify setSelectedItem is NOT called (new behavior for consistent single Esc press)
    expect(mockHierarchyActions.setSelectedItem).not.toHaveBeenCalled();
  });

  it('should delegate edit handlers to provided handlers', () => {
    const { result } = renderHook(() => 
      useHierarchyHandlers({
        handlers: mockHandlers,
        hierarchyActions: mockHierarchyActions,
        setViewMode: mockSetViewMode,
        setSelectedSchema: mockSetSelectedSchema,
        setEditingVersion: mockSetEditingVersion
      })
    );

    expect(result.current.onEditProduct).toBe(mockHandlers.handleEditProduct);
    expect(result.current.onEditDomain).toBe(mockHandlers.handleEditDomain);
    expect(result.current.onEditContext).toBe(mockHandlers.handleEditContext);
    expect(result.current.onEditSchema).toBe(mockHandlers.handleEditSchema);
  });

  it('should handle schema version editing', () => {
    const { result } = renderHook(() => 
      useHierarchyHandlers({
        handlers: mockHandlers,
        hierarchyActions: mockHierarchyActions,
        setViewMode: mockSetViewMode,
        setSelectedSchema: mockSetSelectedSchema,
        setEditingVersion: mockSetEditingVersion
      })
    );

    result.current.onEditSchemaVersion(mockSchema, mockVersion);

    expect(mockSetSelectedSchema).toHaveBeenCalledWith(mockSchema);
    expect(mockSetEditingVersion).toHaveBeenCalledWith(mockVersion);
    expect(mockHierarchyActions.setSelectedItem).toHaveBeenCalledWith({ type: 'version', id: 'version-1' });
    expect(mockSetViewMode).toHaveBeenCalledWith('edit-version');
  });

  it('should set view mode to create-product when onCreateProduct is called', () => {
    const { result } = renderHook(() => 
      useHierarchyHandlers({
        handlers: mockHandlers,
        hierarchyActions: mockHierarchyActions,
        setViewMode: mockSetViewMode,
        setSelectedSchema: mockSetSelectedSchema,
        setEditingVersion: mockSetEditingVersion
      })
    );

    result.current.onCreateProduct();
    expect(mockSetViewMode).toHaveBeenCalledWith('create-product');
  });

  it('should delegate create handlers to provided handlers', () => {
    const { result } = renderHook(() => 
      useHierarchyHandlers({
        handlers: mockHandlers,
        hierarchyActions: mockHierarchyActions,
        setViewMode: mockSetViewMode,
        setSelectedSchema: mockSetSelectedSchema,
        setEditingVersion: mockSetEditingVersion
      })
    );

    expect(result.current.onCreateDomain).toBe(mockHandlers.handleCreateDomain);
    expect(result.current.onCreateContext).toBe(mockHandlers.handleCreateContext);
    expect(result.current.onCreateSchema).toBe(mockHandlers.handleCreateSchema);
    expect(result.current.onCreateSchemaVersion).toBe(mockHandlers.handleCreateSchemaVersion);
  });

  it('should handle pin actions', () => {
    const { result } = renderHook(() => 
      useHierarchyHandlers({
        handlers: mockHandlers,
        hierarchyActions: mockHierarchyActions,
        setViewMode: mockSetViewMode,
        setSelectedSchema: mockSetSelectedSchema,
        setEditingVersion: mockSetEditingVersion
      })
    );

    const mockProduct = { id: 'product-1', name: 'Test' };
    const mockPinnedItem = { type: 'product', item: mockProduct };

    result.current.onPinProduct(mockProduct);
    expect(mockHierarchyActions.setPinnedItem).toHaveBeenCalledWith(mockPinnedItem);

    const mockDomain = { id: 'domain-1', name: 'Test' };
    const mockDomainPinnedItem = { type: 'domain', item: mockDomain };
    result.current.onPinDomain(mockDomain);
    expect(mockHierarchyActions.setPinnedItem).toHaveBeenCalledWith(mockDomainPinnedItem);

    const mockContext = { id: 'context-1', name: 'Test' };
    const mockContextPinnedItem = { type: 'context', item: mockContext };
    result.current.onPinContext(mockContext);
    expect(mockHierarchyActions.setPinnedItem).toHaveBeenCalledWith(mockContextPinnedItem);

    result.current.onUnpin();
    expect(mockHierarchyActions.setPinnedItem).toHaveBeenCalledWith(null);
  });

  it('should handle schema selection', () => {
    const { result } = renderHook(() => 
      useHierarchyHandlers({
        handlers: mockHandlers,
        hierarchyActions: mockHierarchyActions,
        setViewMode: mockSetViewMode,
        setSelectedSchema: mockSetSelectedSchema,
        setEditingVersion: mockSetEditingVersion
      })
    );

    result.current.onSchemaSelect(mockSchema, mockVersion);

    expect(mockSetSelectedSchema).toHaveBeenCalledWith(mockSchema);
    expect(mockSetEditingVersion).toHaveBeenCalledWith(mockVersion);
    expect(mockHierarchyActions.setSelectedItem).toHaveBeenCalledWith({ type: 'version', id: 'version-1' });
    expect(mockSetViewMode).toHaveBeenCalledWith('edit-version');
  });

  it('should memoize handlers properly', () => {
    const { result, rerender } = renderHook(
      (props) => useHierarchyHandlers(props),
      {
        initialProps: {
          handlers: mockHandlers,
          hierarchyActions: mockHierarchyActions,
          setViewMode: mockSetViewMode,
          setSelectedSchema: mockSetSelectedSchema,
          setEditingVersion: mockSetEditingVersion
        }
      }
    );

    const firstResult = result.current;

    // Re-render with same props
    rerender({
      handlers: mockHandlers,
      hierarchyActions: mockHierarchyActions,
      setViewMode: mockSetViewMode,
      setSelectedSchema: mockSetSelectedSchema,
      setEditingVersion: mockSetEditingVersion
    });

    // Should be the same object (memoized)
    expect(result.current).toBe(firstResult);
  });

  it('should update handlers when dependencies change', () => {
    const { result, rerender } = renderHook(
      (props) => useHierarchyHandlers(props),
      {
        initialProps: {
          handlers: mockHandlers,
          hierarchyActions: mockHierarchyActions,
          setViewMode: mockSetViewMode,
          setSelectedSchema: mockSetSelectedSchema,
          setEditingVersion: mockSetEditingVersion
        }
      }
    );

    const firstResult = result.current;

    const newMockHandlers = { ...mockHandlers, handleEditProduct: vi.fn() };

    // Re-render with different handlers
    rerender({
      handlers: newMockHandlers,
      hierarchyActions: mockHierarchyActions,
      setViewMode: mockSetViewMode,
      setSelectedSchema: mockSetSelectedSchema,
      setEditingVersion: mockSetEditingVersion
    });

    // Should be a different object
    expect(result.current).not.toBe(firstResult);
    expect(result.current.onEditProduct).toBe(newMockHandlers.handleEditProduct);
  });
});