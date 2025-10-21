import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useGlobalKeyboardShortcuts } from '../../src/hooks/useGlobalKeyboardShortcuts';

describe('useGlobalKeyboardShortcuts', () => {
  const mockOnFind = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any event listeners
    document.removeEventListener('keydown', vi.fn());
  });

  it('should call onFind when Ctrl+F is pressed', () => {
    renderHook(() => 
      useGlobalKeyboardShortcuts({
        onFind: mockOnFind
      })
    );

    const event = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true
    });
    
    Object.defineProperty(event, 'preventDefault', {
      value: vi.fn(),
      writable: true
    });

    document.dispatchEvent(event);

    expect(mockOnFind).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should call onFind when Cmd+F is pressed (Mac)', () => {
    renderHook(() => 
      useGlobalKeyboardShortcuts({
        onFind: mockOnFind
      })
    );

    const event = new KeyboardEvent('keydown', {
      key: 'f',
      metaKey: true
    });
    
    Object.defineProperty(event, 'preventDefault', {
      value: vi.fn(),
      writable: true
    });

    document.dispatchEvent(event);

    expect(mockOnFind).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should not call onFind when only F is pressed', () => {
    renderHook(() => 
      useGlobalKeyboardShortcuts({
        onFind: mockOnFind
      })
    );

    const event = new KeyboardEvent('keydown', {
      key: 'f'
    });

    document.dispatchEvent(event);

    expect(mockOnFind).not.toHaveBeenCalled();
  });

  it('should not call onFind when Ctrl+other key is pressed', () => {
    renderHook(() => 
      useGlobalKeyboardShortcuts({
        onFind: mockOnFind
      })
    );

    const event = new KeyboardEvent('keydown', {
      key: 'g',
      ctrlKey: true
    });

    document.dispatchEvent(event);

    expect(mockOnFind).not.toHaveBeenCalled();
  });

  it('should remove event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    
    const { unmount } = renderHook(() => 
      useGlobalKeyboardShortcuts({
        onFind: mockOnFind
      })
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });

  it('should update handler when onFind prop changes', () => {
    const mockOnFind2 = vi.fn();
    
    const { rerender } = renderHook(({ onFind }) => 
      useGlobalKeyboardShortcuts({ onFind }),
      { initialProps: { onFind: mockOnFind } }
    );

    // Press Ctrl+F with first handler
    const event1 = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true
    });
    Object.defineProperty(event1, 'preventDefault', {
      value: vi.fn(),
      writable: true
    });
    
    document.dispatchEvent(event1);
    expect(mockOnFind).toHaveBeenCalledTimes(1);
    expect(mockOnFind2).not.toHaveBeenCalled();

    // Change handler
    rerender({ onFind: mockOnFind2 });

    // Press Ctrl+F with second handler
    const event2 = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true
    });
    Object.defineProperty(event2, 'preventDefault', {
      value: vi.fn(),
      writable: true
    });
    
    document.dispatchEvent(event2);
    expect(mockOnFind).toHaveBeenCalledTimes(1); // Still 1
    expect(mockOnFind2).toHaveBeenCalledTimes(1); // Now called
  });
});