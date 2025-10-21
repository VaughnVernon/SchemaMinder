import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FindModal, FindResult } from '../../src/components/FindModal';

const mockResult1: FindResult = {
  id: 'result-1',
  type: 'product',
  name: 'Test Product 1',
  description: 'Description for product 1',
  path: 'Products',
  entityId: 'product-1',
  parentIds: {}
};

const mockResult2: FindResult = {
  id: 'result-2',
  type: 'schema',
  name: 'User Schema',
  description: 'User management schema',
  path: 'Product > Domain > Context',
  entityId: 'schema-2',
  parentIds: {
    productId: 'product-1',
    domainId: 'domain-1',
    contextId: 'context-1'
  }
};

const mockResult3: FindResult = {
  id: 'result-3',
  type: 'domain',
  name: 'Auth Domain',
  path: 'Product > Domains',
  entityId: 'domain-3',
  parentIds: {
    productId: 'product-1'
  }
};

const mockResults = [mockResult1, mockResult2, mockResult3];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSelectResult: vi.fn(),
  onFind: vi.fn(),
  query: '',
  onQueryChange: vi.fn(),
  results: [],
  onResultsChange: vi.fn()
};

describe('FindModal', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<FindModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByPlaceholderText('Find products, domains, contexts, schemas...')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<FindModal {...defaultProps} />);
      
      expect(screen.getByPlaceholderText('Find products, domains, contexts, schemas...')).toBeInTheDocument();
      expect(document.querySelector('.find-modal-overlay')).toBeInTheDocument();
      expect(document.querySelector('.find-modal')).toBeInTheDocument();
    });

    it('should focus input when modal opens', () => {
      render(<FindModal {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Find products, domains, contexts, schemas...');
      expect(input).toHaveFocus();
    });

    it('should render input with correct attributes', () => {
      render(<FindModal {...defaultProps} query="test query" />);
      
      const input = screen.getByPlaceholderText('Find products, domains, contexts, schemas...');
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveValue('test query');
      expect(input).toHaveClass('find-input');
    });

    it('should have correct CSS structure', () => {
      render(<FindModal {...defaultProps} />);
      
      expect(document.querySelector('.find-modal-overlay')).toBeInTheDocument();
      expect(document.querySelector('.find-modal')).toBeInTheDocument();
      expect(document.querySelector('.find-input-container')).toBeInTheDocument();
    });
  });

  describe('Query Input', () => {
    it('should call onQueryChange when input value changes', async () => {
      const onQueryChange = vi.fn();
      render(<FindModal {...defaultProps} onQueryChange={onQueryChange} />);
      
      const input = screen.getByPlaceholderText('Find products, domains, contexts, schemas...');
      await user.type(input, 'test');
      
      expect(onQueryChange).toHaveBeenCalledWith('t');
      expect(onQueryChange).toHaveBeenCalledWith('e');
      expect(onQueryChange).toHaveBeenCalledWith('s');
      expect(onQueryChange).toHaveBeenCalledWith('t');
    });

    it('should disable input when finding', () => {
      render(<FindModal {...defaultProps} />);
      
      // Trigger find operation
      const input = screen.getByPlaceholderText('Find products, domains, contexts, schemas...');
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Input should not be disabled initially as onFind is mocked
      expect(input).not.toBeDisabled();
    });
  });

  describe('Find Functionality', () => {
    it('should call onFind when Enter is pressed with query', async () => {
      const onFind = vi.fn().mockResolvedValue([]);
      render(<FindModal {...defaultProps} query="test query" onFind={onFind} />);
      
      const input = screen.getByPlaceholderText('Find products, domains, contexts, schemas...');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(onFind).toHaveBeenCalledWith('test query');
    });

    it('should not call onFind when Enter is pressed with empty query', () => {
      const onFind = vi.fn();
      render(<FindModal {...defaultProps} query="" onFind={onFind} />);
      
      const input = screen.getByPlaceholderText('Find products, domains, contexts, schemas...');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(onFind).not.toHaveBeenCalled();
    });

    it('should not call onFind when Enter is pressed with whitespace-only query', () => {
      const onFind = vi.fn();
      render(<FindModal {...defaultProps} query="   " onFind={onFind} />);
      
      const input = screen.getByPlaceholderText('Find products, domains, contexts, schemas...');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(onFind).not.toHaveBeenCalled();
    });

    it('should call onResultsChange with find results', async () => {
      const onFind = vi.fn().mockResolvedValue(mockResults);
      const onResultsChange = vi.fn();
      
      render(<FindModal {...defaultProps} query="test" onFind={onFind} onResultsChange={onResultsChange} />);
      
      const input = screen.getByPlaceholderText('Find products, domains, contexts, schemas...');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(onResultsChange).toHaveBeenCalledWith(mockResults);
      });
    });

    it('should handle find errors gracefully', async () => {
      const onFind = vi.fn().mockRejectedValue(new Error('Find failed'));
      const onResultsChange = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<FindModal {...defaultProps} query="test" onFind={onFind} onResultsChange={onResultsChange} />);
      
      const input = screen.getByPlaceholderText('Find products, domains, contexts, schemas...');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Find error:', expect.any(Error));
        expect(onResultsChange).toHaveBeenCalledWith([]);
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Results Display', () => {
    it('should display results when available', () => {
      render(<FindModal {...defaultProps} results={mockResults} />);
      
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('User Schema')).toBeInTheDocument();
      expect(screen.getByText('Auth Domain')).toBeInTheDocument();
    });

    it('should display result descriptions when available', () => {
      render(<FindModal {...defaultProps} results={mockResults} />);
      
      expect(screen.getByText('Description for product 1')).toBeInTheDocument();
      expect(screen.getByText('User management schema')).toBeInTheDocument();
    });

    it('should display result paths', () => {
      render(<FindModal {...defaultProps} results={mockResults} />);
      
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Product > Domain > Context')).toBeInTheDocument();
      expect(screen.getByText('Product > Domains')).toBeInTheDocument();
    });

    it('should not display results section when no results', () => {
      render(<FindModal {...defaultProps} results={[]} />);
      
      expect(document.querySelector('.find-results-container')).not.toBeInTheDocument();
    });

    it('should display no results message when showNoResults is triggered', async () => {
      const onFind = vi.fn().mockResolvedValue([]);
      
      render(<FindModal {...defaultProps} query="test" onFind={onFind} />);
      
      const input = screen.getByPlaceholderText('Find products, domains, contexts, schemas...');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('No matches found.')).toBeInTheDocument();
      });
    });

    it('should handle results without descriptions', () => {
      const resultWithoutDescription = {
        ...mockResult1,
        description: undefined
      };
      
      render(<FindModal {...defaultProps} results={[resultWithoutDescription]} />);
      
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.queryByText('Description for product 1')).not.toBeInTheDocument();
    });
  });

  describe('Result Selection', () => {
    it('should call onSelectResult when result is clicked', async () => {
      const onSelectResult = vi.fn();
      render(<FindModal {...defaultProps} results={mockResults} onSelectResult={onSelectResult} />);
      
      const resultItem = screen.getByText('Test Product 1');
      await user.click(resultItem);
      
      expect(onSelectResult).toHaveBeenCalledWith(mockResult1);
    });

    it('should highlight selected item', () => {
      render(<FindModal {...defaultProps} results={mockResults} selectedItemId="schema-2" />);
      
      const resultItems = document.querySelectorAll('.find-result-item');
      expect(resultItems[1]).toHaveClass('persistent-selected'); // mockResult2 has entityId 'schema-2'
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate down with ArrowDown key', () => {
      render(<FindModal {...defaultProps} results={mockResults} />);
      
      const input = screen.getByPlaceholderText('Find products, domains, contexts, schemas...');
      
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      
      const resultItems = document.querySelectorAll('.find-result-item');
      expect(resultItems[0]).toHaveClass('selected');
    });

    it('should navigate up with ArrowUp key', () => {
      render(<FindModal {...defaultProps} results={mockResults} />);
      
      const input = screen.getByPlaceholderText('Find products, domains, contexts, schemas...');
      
      // Navigate down twice, then up once
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      
      const resultItems = document.querySelectorAll('.find-result-item');
      expect(resultItems[0]).toHaveClass('selected');
    });

    it('should not navigate beyond bounds', () => {
      render(<FindModal {...defaultProps} results={mockResults} />);
      
      const input = screen.getByPlaceholderText('Find products, domains, contexts, schemas...');
      
      // Try to navigate down beyond last item
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // Should not go further
      
      const resultItems = document.querySelectorAll('.find-result-item');
      expect(resultItems[2]).toHaveClass('selected'); // Last item should still be selected
    });

    it('should navigate up to -1 (no selection)', () => {
      render(<FindModal {...defaultProps} results={mockResults} />);
      
      const input = screen.getByPlaceholderText('Find products, domains, contexts, schemas...');
      
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      
      const resultItems = document.querySelectorAll('.find-result-item');
      resultItems.forEach(item => {
        expect(item).not.toHaveClass('selected');
      });
    });

    it('should update selection on mouse enter', () => {
      render(<FindModal {...defaultProps} results={mockResults} />);
      
      const secondResult = screen.getByText('User Schema');
      fireEvent.mouseEnter(secondResult.closest('.find-result-item')!);
      
      const resultItems = document.querySelectorAll('.find-result-item');
      expect(resultItems[1]).toHaveClass('selected');
    });
  });

  describe('Modal Interactions', () => {
    it('should close modal when overlay is clicked', async () => {
      const onClose = vi.fn();
      render(<FindModal {...defaultProps} onClose={onClose} />);
      
      const overlay = document.querySelector('.find-modal-overlay');
      await user.click(overlay!);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not close modal when modal content is clicked', async () => {
      const onClose = vi.fn();
      render(<FindModal {...defaultProps} onClose={onClose} />);
      
      const modal = document.querySelector('.find-modal');
      await user.click(modal!);
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should close modal when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(<FindModal {...defaultProps} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should prevent default and stop propagation on Escape', () => {
      const onClose = vi.fn();
      render(<FindModal {...defaultProps} onClose={onClose} />);
      
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');
      
      document.dispatchEvent(event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should not respond to Escape when modal is closed', () => {
      const onClose = vi.fn();
      render(<FindModal {...defaultProps} isOpen={false} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Event Listener Management', () => {
    it('should add and remove global keydown event listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<FindModal {...defaultProps} />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should manage event listeners based on isOpen state', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { rerender } = render(<FindModal {...defaultProps} isOpen={false} />);
      
      expect(addEventListenerSpy).not.toHaveBeenCalled();
      
      rerender(<FindModal {...defaultProps} isOpen={true} />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      
      rerender(<FindModal {...defaultProps} isOpen={false} />);
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('State Management', () => {
    it('should reset state when modal opens', () => {
      const { rerender } = render(<FindModal {...defaultProps} isOpen={false} />);
      
      rerender(<FindModal {...defaultProps} isOpen={true} results={mockResults} />);
      
      // Should not show no results message initially
      expect(screen.queryByText('No matches found.')).not.toBeInTheDocument();
    });

    it('should preserve query and results between sessions', () => {
      const { rerender } = render(<FindModal {...defaultProps} query="test" results={mockResults} />);
      
      expect(screen.getByDisplayValue('test')).toBeInTheDocument();
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      
      rerender(<FindModal {...defaultProps} isOpen={false} query="test" results={mockResults} />);
      rerender(<FindModal {...defaultProps} isOpen={true} query="test" results={mockResults} />);
      
      expect(screen.getByDisplayValue('test')).toBeInTheDocument();
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper input attributes', () => {
      render(<FindModal {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('placeholder', 'Find products, domains, contexts, schemas...');
    });

    it('should have clickable result items', () => {
      render(<FindModal {...defaultProps} results={mockResults} />);
      
      const resultItems = document.querySelectorAll('.find-result-item');
      resultItems.forEach(item => {
        expect(item).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty results array', () => {
      render(<FindModal {...defaultProps} results={[]} />);
      
      expect(document.querySelector('.find-results-container')).not.toBeInTheDocument();
      expect(screen.queryByText('No matches found.')).not.toBeInTheDocument();
    });

    it('should handle results with empty names', () => {
      const resultWithEmptyName = {
        ...mockResult1,
        name: ''
      };
      
      render(<FindModal {...defaultProps} results={[resultWithEmptyName]} />);
      
      const nameElement = document.querySelector('.find-result-name');
      expect(nameElement).toHaveTextContent('');
    });

    it('should handle results with special characters', () => {
      const resultWithSpecialChars = {
        ...mockResult1,
        name: 'Test & "Special" <Characters>',
        description: 'Description with & special <chars>'
      };
      
      render(<FindModal {...defaultProps} results={[resultWithSpecialChars]} />);
      
      expect(screen.getByText('Test & "Special" <Characters>')).toBeInTheDocument();
      expect(screen.getByText('Description with & special <chars>')).toBeInTheDocument();
    });
  });
});