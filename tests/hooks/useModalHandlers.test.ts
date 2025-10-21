import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useModalHandlers } from '../../src/hooks/useModalHandlers';
import { FindResult } from '../../src/types/schema';

describe('useModalHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useModalHandlers());

    expect(result.current.isFindOpen).toBe(false);
    expect(result.current.findQuery).toBe('');
    expect(result.current.findResults).toEqual([]);
    expect(result.current.isFilterOpen).toBe(false);
    expect(result.current.filterMousePosition).toBeUndefined();
  });

  it('should provide all expected properties and methods', () => {
    const { result } = renderHook(() => useModalHandlers());

    // State properties
    expect(result.current).toHaveProperty('isFindOpen');
    expect(result.current).toHaveProperty('findQuery');
    expect(result.current).toHaveProperty('findResults');
    expect(result.current).toHaveProperty('isFilterOpen');
    expect(result.current).toHaveProperty('filterMousePosition');

    // Find modal methods
    expect(result.current).toHaveProperty('setIsFindOpen');
    expect(result.current).toHaveProperty('setFindQuery');
    expect(result.current).toHaveProperty('setFindResults');
    expect(result.current).toHaveProperty('handleFindClose');
    expect(result.current).toHaveProperty('showFindModal');

    // Filter modal methods
    expect(result.current).toHaveProperty('setIsFilterOpen');
    expect(result.current).toHaveProperty('setFilterMousePosition');
    expect(result.current).toHaveProperty('handleFilterClose');
    expect(result.current).toHaveProperty('showFilterModal');

    // Message modal method
    expect(result.current).toHaveProperty('showMessageModal');

    // Check that methods are functions
    expect(typeof result.current.setIsFindOpen).toBe('function');
    expect(typeof result.current.showFindModal).toBe('function');
    expect(typeof result.current.handleFindClose).toBe('function');
    expect(typeof result.current.showFilterModal).toBe('function');
    expect(typeof result.current.handleFilterClose).toBe('function');
    expect(typeof result.current.showMessageModal).toBe('function');
  });

  describe('Find Modal', () => {
    it('should handle find modal state changes', () => {
      const { result } = renderHook(() => useModalHandlers());

      // Open find modal
      act(() => {
        result.current.setIsFindOpen(true);
      });
      expect(result.current.isFindOpen).toBe(true);

      // Close find modal
      act(() => {
        result.current.setIsFindOpen(false);
      });
      expect(result.current.isFindOpen).toBe(false);
    });

    it('should handle find query changes', () => {
      const { result } = renderHook(() => useModalHandlers());

      act(() => {
        result.current.setFindQuery('test query');
      });
      expect(result.current.findQuery).toBe('test query');

      act(() => {
        result.current.setFindQuery('');
      });
      expect(result.current.findQuery).toBe('');
    });

    it('should handle find results changes', () => {
      const { result } = renderHook(() => useModalHandlers());

      const mockResults: FindResult[] = [
        { type: 'schema', id: 'schema-1', name: 'Test Schema', path: 'Product > Domain > Context' }
      ];

      act(() => {
        result.current.setFindResults(mockResults);
      });
      expect(result.current.findResults).toEqual(mockResults);

      act(() => {
        result.current.setFindResults([]);
      });
      expect(result.current.findResults).toEqual([]);
    });

    it('should handle showFindModal', () => {
      const { result } = renderHook(() => useModalHandlers());

      act(() => {
        result.current.showFindModal();
      });
      expect(result.current.isFindOpen).toBe(true);
    });

    it('should handle handleFindClose', () => {
      const { result } = renderHook(() => useModalHandlers());

      // First open it
      act(() => {
        result.current.setIsFindOpen(true);
      });
      expect(result.current.isFindOpen).toBe(true);

      // Then close it using handler
      act(() => {
        result.current.handleFindClose();
      });
      expect(result.current.isFindOpen).toBe(false);
    });
  });

  describe('Filter Modal', () => {
    it('should handle filter modal state changes', () => {
      const { result } = renderHook(() => useModalHandlers());

      // Open filter modal
      act(() => {
        result.current.setIsFilterOpen(true);
      });
      expect(result.current.isFilterOpen).toBe(true);

      // Close filter modal
      act(() => {
        result.current.setIsFilterOpen(false);
      });
      expect(result.current.isFilterOpen).toBe(false);
    });

    it('should handle filter mouse position changes', () => {
      const { result } = renderHook(() => useModalHandlers());

      const mousePosition = { x: 100, y: 200 };

      act(() => {
        result.current.setFilterMousePosition(mousePosition);
      });
      expect(result.current.filterMousePosition).toEqual(mousePosition);

      act(() => {
        result.current.setFilterMousePosition(undefined);
      });
      expect(result.current.filterMousePosition).toBeUndefined();
    });

    it('should handle showFilterModal', () => {
      const { result } = renderHook(() => useModalHandlers());

      const mousePosition = { x: 150, y: 250 };

      act(() => {
        result.current.showFilterModal(mousePosition);
      });
      
      expect(result.current.isFilterOpen).toBe(true);
      expect(result.current.filterMousePosition).toEqual(mousePosition);
    });

    it('should handle handleFilterClose', () => {
      const { result } = renderHook(() => useModalHandlers());

      // First open it
      act(() => {
        result.current.setIsFilterOpen(true);
      });
      expect(result.current.isFilterOpen).toBe(true);

      // Then close it using handler
      act(() => {
        result.current.handleFilterClose();
      });
      expect(result.current.isFilterOpen).toBe(false);
    });
  });

  describe('Message Modal', () => {
    it('should handle showMessageModal with message only', () => {
      const { result } = renderHook(() => useModalHandlers());

      act(() => {
        result.current.showMessageModal('Test message');
      });

      expect(console.log).toHaveBeenCalledWith('Message modal:', 'Test message', undefined);
    });

    it('should handle showMessageModal with message and details', () => {
      const { result } = renderHook(() => useModalHandlers());

      act(() => {
        result.current.showMessageModal('Test message', 'Test details');
      });

      expect(console.log).toHaveBeenCalledWith('Message modal:', 'Test message', 'Test details');
    });
  });

  describe('Handler Stability', () => {
    it('should memoize handlers properly', () => {
      const { result, rerender } = renderHook(() => useModalHandlers());

      const initialHandlers = {
        handleFindClose: result.current.handleFindClose,
        showFindModal: result.current.showFindModal,
        handleFilterClose: result.current.handleFilterClose,
        showFilterModal: result.current.showFilterModal,
        showMessageModal: result.current.showMessageModal
      };

      // Re-render
      rerender();

      // Handlers should be the same objects (memoized)
      expect(result.current.handleFindClose).toBe(initialHandlers.handleFindClose);
      expect(result.current.showFindModal).toBe(initialHandlers.showFindModal);
      expect(result.current.handleFilterClose).toBe(initialHandlers.handleFilterClose);
      expect(result.current.showFilterModal).toBe(initialHandlers.showFilterModal);
      expect(result.current.showMessageModal).toBe(initialHandlers.showMessageModal);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle concurrent modal operations', () => {
      const { result } = renderHook(() => useModalHandlers());

      const mousePosition = { x: 300, y: 400 };

      // Open both modals
      act(() => {
        result.current.showFindModal();
        result.current.showFilterModal(mousePosition);
      });

      expect(result.current.isFindOpen).toBe(true);
      expect(result.current.isFilterOpen).toBe(true);
      expect(result.current.filterMousePosition).toEqual(mousePosition);

      // Close both modals
      act(() => {
        result.current.handleFindClose();
        result.current.handleFilterClose();
      });

      expect(result.current.isFindOpen).toBe(false);
      expect(result.current.isFilterOpen).toBe(false);
    });
  });
});