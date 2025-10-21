import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHierarchyTree } from '../../src/hooks/useHierarchyTree';
import { Product, Domain, Context, Schema, SchemaStatus } from '../../src/types/schema';

// Mock data
const mockProduct: Product = {
  id: 'product-1',
  name: 'Test Product',
  domains: []
};

const mockDomain: Domain = {
  id: 'domain-1', 
  name: 'Test Domain',
  contexts: []
};

const mockContext: Context = {
  id: 'context-1',
  name: 'Test Context', 
  schemas: []
};

const mockSchema: Schema = {
  id: 'schema-1',
  name: 'Test Schema',
  schemaTypeCategory: 'Events' as any,
  versions: [
    {
      id: 'version-1',
      semanticVersion: '1.0.0',
      specification: 'test spec',
      status: SchemaStatus.Draft
    }
  ]
};

describe('useHierarchyTree', () => {
  const mockProps = {
    products: [mockProduct],
    statusFilter: undefined,
    onFind: vi.fn(),
    onFilter: vi.fn()
  };

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useHierarchyTree(mockProps));

    expect(result.current.state.products).toEqual([mockProduct]);
    expect(result.current.state.expandedItems).toEqual(new Set());
    expect(result.current.state.selectedItem).toBeUndefined();
    expect(result.current.state.pinnedItem).toBeNull();
    expect(result.current.state.statusFilter).toBeUndefined();
  });

  it('should provide correct callbacks', () => {
    const { result } = renderHook(() => useHierarchyTree(mockProps));

    expect(result.current.callbacks.onFind).toBe(mockProps.onFind);
    expect(result.current.callbacks.onFilter).toBe(mockProps.onFilter);
    expect(typeof result.current.callbacks.onExpandedItemsChange).toBe('function');
  });

  describe('actions', () => {
    it('should toggle expanded items', () => {
      const { result } = renderHook(() => useHierarchyTree(mockProps));

      act(() => {
        result.current.actions.toggleExpanded('item-1');
      });

      expect(result.current.state.expandedItems.has('item-1')).toBe(true);

      act(() => {
        result.current.actions.toggleExpanded('item-1');
      });

      expect(result.current.state.expandedItems.has('item-1')).toBe(false);
    });

    it('should set selected item', () => {
      const { result } = renderHook(() => useHierarchyTree(mockProps));

      act(() => {
        result.current.actions.selectItem('product', 'product-1');
      });

      expect(result.current.state.selectedItem).toEqual({
        type: 'product',
        id: 'product-1'
      });
    });

    it('should set selected item directly', () => {
      const { result } = renderHook(() => useHierarchyTree(mockProps));

      const selectedItem = { type: 'domain' as const, id: 'domain-1' };

      act(() => {
        result.current.actions.setSelectedItem(selectedItem);
      });

      expect(result.current.state.selectedItem).toEqual(selectedItem);
    });

    it('should select schema version', () => {
      const { result } = renderHook(() => useHierarchyTree(mockProps));

      act(() => {
        result.current.actions.selectSchema(mockSchema, mockSchema.versions[0]);
      });

      expect(result.current.state.selectedItem).toEqual({
        type: 'version',
        id: 'version-1'
      });
    });

    it('should pin product', () => {
      const { result } = renderHook(() => useHierarchyTree(mockProps));

      act(() => {
        result.current.actions.pinProduct(mockProduct);
      });

      expect(result.current.state.pinnedItem).toEqual({
        type: 'product',
        item: mockProduct
      });
    });

    it('should pin domain', () => {
      const { result } = renderHook(() => useHierarchyTree(mockProps));

      act(() => {
        result.current.actions.pinDomain(mockDomain);
      });

      expect(result.current.state.pinnedItem).toEqual({
        type: 'domain',
        item: mockDomain
      });
    });

    it('should pin context', () => {
      const { result } = renderHook(() => useHierarchyTree(mockProps));

      act(() => {
        result.current.actions.pinContext(mockContext);
      });

      expect(result.current.state.pinnedItem).toEqual({
        type: 'context',
        item: mockContext
      });
    });

    it('should unpin item', () => {
      const { result } = renderHook(() => useHierarchyTree(mockProps));

      // First pin something
      act(() => {
        result.current.actions.pinProduct(mockProduct);
      });

      expect(result.current.state.pinnedItem).not.toBeNull();

      // Then unpin
      act(() => {
        result.current.actions.unpin();
      });

      expect(result.current.state.pinnedItem).toBeNull();
    });

    it('should handle expanded items change through callback', () => {
      const { result } = renderHook(() => useHierarchyTree(mockProps));

      const newExpandedItems = new Set(['item-1', 'item-2']);

      act(() => {
        result.current.callbacks.onExpandedItemsChange(newExpandedItems);
      });

      expect(result.current.state.expandedItems).toEqual(newExpandedItems);
    });
  });

  it('should update when props change', () => {
    const { result, rerender } = renderHook(
      (props) => useHierarchyTree(props),
      { initialProps: mockProps }
    );

    expect(result.current.state.products).toEqual([mockProduct]);

    const newProducts = [mockProduct, { ...mockProduct, id: 'product-2', name: 'Product 2' }];
    const newProps = { ...mockProps, products: newProducts };

    rerender(newProps);

    expect(result.current.state.products).toEqual(newProducts);
  });
});