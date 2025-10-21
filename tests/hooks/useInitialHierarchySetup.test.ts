import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useInitialHierarchySetup } from '../../src/hooks/useInitialHierarchySetup';
import { Product, SchemaTypeCategory, SchemaStatus } from '../../src/types/schema';

describe('useInitialHierarchySetup', () => {
  const mockSetCurrentContextId = vi.fn();
  const mockSetExpandedItems = vi.fn();

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
              schemas: []
            }
          ]
        }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set up initial hierarchy when products are loaded and no current context', () => {
    renderHook(() => 
      useInitialHierarchySetup({
        products: mockProducts,
        currentContextId: '',
        setCurrentContextId: mockSetCurrentContextId,
        setExpandedItems: mockSetExpandedItems
      })
    );

    expect(mockSetCurrentContextId).toHaveBeenCalledWith('context-1');
    expect(mockSetExpandedItems).toHaveBeenCalledWith(
      new Set(['product-1', 'domain-1', 'context-1'])
    );
  });

  it('should not set up hierarchy when current context already exists', () => {
    renderHook(() => 
      useInitialHierarchySetup({
        products: mockProducts,
        currentContextId: 'existing-context',
        setCurrentContextId: mockSetCurrentContextId,
        setExpandedItems: mockSetExpandedItems
      })
    );

    expect(mockSetCurrentContextId).not.toHaveBeenCalled();
    expect(mockSetExpandedItems).not.toHaveBeenCalled();
  });

  it('should not set up hierarchy when no products exist', () => {
    renderHook(() => 
      useInitialHierarchySetup({
        products: [],
        currentContextId: '',
        setCurrentContextId: mockSetCurrentContextId,
        setExpandedItems: mockSetExpandedItems
      })
    );

    expect(mockSetCurrentContextId).not.toHaveBeenCalled();
    expect(mockSetExpandedItems).not.toHaveBeenCalled();
  });

  it('should not set up hierarchy when product has no domains', () => {
    const productWithoutDomains: Product[] = [
      {
        id: 'product-1',
        name: 'Test Product',
        domains: []
      }
    ];

    renderHook(() => 
      useInitialHierarchySetup({
        products: productWithoutDomains,
        currentContextId: '',
        setCurrentContextId: mockSetCurrentContextId,
        setExpandedItems: mockSetExpandedItems
      })
    );

    expect(mockSetCurrentContextId).not.toHaveBeenCalled();
    expect(mockSetExpandedItems).not.toHaveBeenCalled();
  });

  it('should not set up hierarchy when domain has no contexts', () => {
    const productWithoutContexts: Product[] = [
      {
        id: 'product-1',
        name: 'Test Product',
        domains: [
          {
            id: 'domain-1',
            name: 'Test Domain',
            contexts: []
          }
        ]
      }
    ];

    renderHook(() => 
      useInitialHierarchySetup({
        products: productWithoutContexts,
        currentContextId: '',
        setCurrentContextId: mockSetCurrentContextId,
        setExpandedItems: mockSetExpandedItems
      })
    );

    expect(mockSetCurrentContextId).not.toHaveBeenCalled();
    expect(mockSetExpandedItems).not.toHaveBeenCalled();
  });

  it('should re-run setup when products change', () => {
    const { rerender } = renderHook(({ products }) => 
      useInitialHierarchySetup({
        products,
        currentContextId: '',
        setCurrentContextId: mockSetCurrentContextId,
        setExpandedItems: mockSetExpandedItems
      }),
      { initialProps: { products: [] } }
    );

    expect(mockSetCurrentContextId).not.toHaveBeenCalled();

    // Change products
    rerender({ products: mockProducts });

    expect(mockSetCurrentContextId).toHaveBeenCalledWith('context-1');
    expect(mockSetExpandedItems).toHaveBeenCalledWith(
      new Set(['product-1', 'domain-1', 'context-1'])
    );
  });
});