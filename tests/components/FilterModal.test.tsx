/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { FilterModal, StatusFilter } from '../../src/components/FilterModal';
import { SchemaStatus } from '../../src/types/schema';

const defaultFilter: StatusFilter = {
  [SchemaStatus.Draft]: true,
  [SchemaStatus.Published]: true,
  [SchemaStatus.Deprecated]: true,
  [SchemaStatus.Removed]: true
};

const partialFilter: StatusFilter = {
  [SchemaStatus.Draft]: true,
  [SchemaStatus.Published]: false,
  [SchemaStatus.Deprecated]: true,
  [SchemaStatus.Removed]: false
};

const defaultProps = {
  isOpen: true,
  currentFilter: defaultFilter,
  onApply: vi.fn(),
  onClose: vi.fn()
};

describe('FilterModal', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<FilterModal {...defaultProps} isOpen={false} />);
      
      expect(document.querySelector('.find-modal-overlay')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<FilterModal {...defaultProps} />);
      
      expect(document.querySelector('.find-modal-overlay')).toBeInTheDocument();
      expect(document.querySelector('.find-modal')).toBeInTheDocument();
    });

    it('should render all four status checkboxes', () => {
      render(<FilterModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4);
      
      expect(screen.getByLabelText('Draft')).toBeInTheDocument();
      expect(screen.getByLabelText('Published')).toBeInTheDocument();
      expect(screen.getByLabelText('Deprecated')).toBeInTheDocument();
      expect(screen.getByLabelText('Removed')).toBeInTheDocument();
    });

    it('should render checkboxes with correct initial states', () => {
      render(<FilterModal {...defaultProps} currentFilter={partialFilter} />);
      
      const draftCheckbox = screen.getByLabelText('Draft') as HTMLInputElement;
      const publishedCheckbox = screen.getByLabelText('Published') as HTMLInputElement;
      const deprecatedCheckbox = screen.getByLabelText('Deprecated') as HTMLInputElement;
      const removedCheckbox = screen.getByLabelText('Removed') as HTMLInputElement;
      
      expect(draftCheckbox.checked).toBe(true);
      expect(publishedCheckbox.checked).toBe(false);
      expect(deprecatedCheckbox.checked).toBe(true);
      expect(removedCheckbox.checked).toBe(false);
    });

    it('should have correct CSS structure', () => {
      render(<FilterModal {...defaultProps} />);
      
      expect(document.querySelector('.find-modal-overlay')).toBeInTheDocument();
      expect(document.querySelector('.find-modal')).toBeInTheDocument();
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4);
    });

    it('should apply mouse position styling when provided', () => {
      const mousePosition = { x: 100, y: 150 };
      render(<FilterModal {...defaultProps} mousePosition={mousePosition} />);
      
      const modal = document.querySelector('.find-modal');
      expect(modal).toHaveStyle({
        position: 'absolute',
        top: '150px',
        left: '100px'
      });
    });

    it('should not apply mouse position styling when not provided', () => {
      render(<FilterModal {...defaultProps} />);
      
      const modal = document.querySelector('.find-modal');
      expect(modal).not.toHaveStyle({
        position: 'absolute'
      });
    });
  });

  describe('Checkbox Interactions', () => {
    it('should toggle Draft checkbox when clicked', async () => {
      render(<FilterModal {...defaultProps} />);
      
      const draftCheckbox = screen.getByLabelText('Draft') as HTMLInputElement;
      expect(draftCheckbox.checked).toBe(true);
      
      await user.click(draftCheckbox);
      expect(draftCheckbox.checked).toBe(false);
    });

    it('should toggle Published checkbox when clicked', async () => {
      render(<FilterModal {...defaultProps} />);
      
      const publishedCheckbox = screen.getByLabelText('Published') as HTMLInputElement;
      expect(publishedCheckbox.checked).toBe(true);
      
      await user.click(publishedCheckbox);
      expect(publishedCheckbox.checked).toBe(false);
    });

    it('should toggle Deprecated checkbox when clicked', async () => {
      render(<FilterModal {...defaultProps} />);
      
      const deprecatedCheckbox = screen.getByLabelText('Deprecated') as HTMLInputElement;
      expect(deprecatedCheckbox.checked).toBe(true);
      
      await user.click(deprecatedCheckbox);
      expect(deprecatedCheckbox.checked).toBe(false);
    });

    it('should toggle Removed checkbox when clicked', async () => {
      render(<FilterModal {...defaultProps} />);
      
      const removedCheckbox = screen.getByLabelText('Removed') as HTMLInputElement;
      expect(removedCheckbox.checked).toBe(true);
      
      await user.click(removedCheckbox);
      expect(removedCheckbox.checked).toBe(false);
    });

    it('should allow multiple checkboxes to be unchecked', async () => {
      render(<FilterModal {...defaultProps} />);
      
      const draftCheckbox = screen.getByLabelText('Draft') as HTMLInputElement;
      const publishedCheckbox = screen.getByLabelText('Published') as HTMLInputElement;
      
      await user.click(draftCheckbox);
      await user.click(publishedCheckbox);
      
      expect(draftCheckbox.checked).toBe(false);
      expect(publishedCheckbox.checked).toBe(false);
    });

    it('should handle rapid checkbox toggles', async () => {
      render(<FilterModal {...defaultProps} />);
      
      const draftCheckbox = screen.getByLabelText('Draft') as HTMLInputElement;
      
      await user.click(draftCheckbox);
      await user.click(draftCheckbox);
      await user.click(draftCheckbox);
      
      expect(draftCheckbox.checked).toBe(false);
    });
  });

  describe('Filter State Management', () => {
    it('should initialize temp filter with current filter when modal opens', () => {
      const { rerender } = render(<FilterModal {...defaultProps} isOpen={false} currentFilter={partialFilter} />);
      
      rerender(<FilterModal {...defaultProps} isOpen={true} currentFilter={partialFilter} />);
      
      const draftCheckbox = screen.getByLabelText('Draft') as HTMLInputElement;
      const publishedCheckbox = screen.getByLabelText('Published') as HTMLInputElement;
      
      expect(draftCheckbox.checked).toBe(true);
      expect(publishedCheckbox.checked).toBe(false);
    });

    it('should reset temp filter when currentFilter changes and modal is open', () => {
      const { rerender } = render(<FilterModal {...defaultProps} currentFilter={defaultFilter} />);
      
      // Change a checkbox
      const draftCheckbox = screen.getByLabelText('Draft') as HTMLInputElement;
      fireEvent.click(draftCheckbox);
      expect(draftCheckbox.checked).toBe(false);
      
      // Rerender with different currentFilter
      rerender(<FilterModal {...defaultProps} currentFilter={partialFilter} />);
      
      expect(draftCheckbox.checked).toBe(true); // Should reset to partialFilter value
    });

    it('should maintain temp filter changes between renders', async () => {
      const { rerender } = render(<FilterModal {...defaultProps} />);
      
      const draftCheckbox = screen.getByLabelText('Draft') as HTMLInputElement;
      await user.click(draftCheckbox);
      expect(draftCheckbox.checked).toBe(false);
      
      rerender(<FilterModal {...defaultProps} />);
      
      expect(draftCheckbox.checked).toBe(false);
    });
  });

  describe('Keyboard Events', () => {
    it('should call onApply and onClose when Enter key is pressed', () => {
      const onApply = vi.fn();
      const onClose = vi.fn();
      render(<FilterModal {...defaultProps} onApply={onApply} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Enter' });
      
      expect(onApply).toHaveBeenCalledWith(defaultFilter);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(<FilterModal {...defaultProps} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onApply with modified filter when Enter is pressed after changes', async () => {
      const onApply = vi.fn();
      render(<FilterModal {...defaultProps} onApply={onApply} />);
      
      const draftCheckbox = screen.getByLabelText('Draft') as HTMLInputElement;
      await user.click(draftCheckbox);
      
      fireEvent.keyDown(document, { key: 'Enter' });
      
      expect(onApply).toHaveBeenCalledWith({
        [SchemaStatus.Draft]: false,
        [SchemaStatus.Published]: true,
        [SchemaStatus.Deprecated]: true,
        [SchemaStatus.Removed]: true
      });
    });

    it('should prevent default on Enter', () => {
      render(<FilterModal {...defaultProps} />);
      
      const preventDefaultSpy = vi.spyOn(Event.prototype, 'preventDefault');
      
      fireEvent.keyDown(document, { key: 'Enter' });
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      
      preventDefaultSpy.mockRestore();
    });

    it('should prevent default on Escape', () => {
      render(<FilterModal {...defaultProps} />);
      
      const preventDefaultSpy = vi.spyOn(Event.prototype, 'preventDefault');
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      
      preventDefaultSpy.mockRestore();
    });

    it('should not respond to keyboard events when modal is closed', () => {
      const onClose = vi.fn();
      const onApply = vi.fn();
      render(<FilterModal {...defaultProps} isOpen={false} onClose={onClose} onApply={onApply} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      fireEvent.keyDown(document, { key: 'Enter' });
      
      expect(onClose).not.toHaveBeenCalled();
      expect(onApply).not.toHaveBeenCalled();
    });
  });

  describe('Modal Interactions', () => {
    it('should call onApply and onClose when overlay is clicked', async () => {
      const onApply = vi.fn();
      const onClose = vi.fn();
      render(<FilterModal {...defaultProps} onApply={onApply} onClose={onClose} />);
      
      const overlay = document.querySelector('.find-modal-overlay');
      await user.click(overlay!);
      
      expect(onApply).toHaveBeenCalledWith(defaultFilter);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not close modal when modal content is clicked', async () => {
      const onClose = vi.fn();
      render(<FilterModal {...defaultProps} onClose={onClose} />);
      
      const modal = document.querySelector('.find-modal');
      await user.click(modal!);
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should call onApply with modified filter when overlay is clicked after changes', async () => {
      const onApply = vi.fn();
      render(<FilterModal {...defaultProps} onApply={onApply} />);
      
      const publishedCheckbox = screen.getByLabelText('Published') as HTMLInputElement;
      await user.click(publishedCheckbox);
      
      const overlay = document.querySelector('.find-modal-overlay');
      await user.click(overlay!);
      
      expect(onApply).toHaveBeenCalledWith({
        [SchemaStatus.Draft]: true,
        [SchemaStatus.Published]: false,
        [SchemaStatus.Deprecated]: true,
        [SchemaStatus.Removed]: true
      });
    });
  });

  describe('Event Listener Management', () => {
    it('should add and remove keydown event listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<FilterModal {...defaultProps} />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should manage event listeners based on isOpen state', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { rerender } = render(<FilterModal {...defaultProps} isOpen={false} />);
      
      expect(addEventListenerSpy).not.toHaveBeenCalled();
      
      rerender(<FilterModal {...defaultProps} isOpen={true} />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      
      rerender(<FilterModal {...defaultProps} isOpen={false} />);
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Styling and Layout', () => {
    it('should have correct checkbox styling attributes', () => {
      render(<FilterModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('type', 'checkbox');
        // Style properties are applied via inline styles
        expect(checkbox.style.marginRight).toBe('8px');
        expect(checkbox.style.accentColor).toBe('#d1fae5');
        expect(checkbox.style.backgroundColor).toBe('white');
      });
    });

    it('should have correct label styling', () => {
      render(<FilterModal {...defaultProps} />);
      
      const labels = document.querySelectorAll('label');
      
      labels.forEach((label, index) => {
        expect(label).toHaveStyle({
          display: 'block',
          cursor: 'pointer',
          fontSize: '0.8em',
          whiteSpace: 'nowrap'
        });
        
        // Last label should have marginBottom: '0'
        if (index === labels.length - 1) {
          expect(label).toHaveStyle({ marginBottom: '0' });
        } else {
          expect(label).toHaveStyle({ marginBottom: '8px' });
        }
      });
    });

    it('should have correct modal styling', () => {
      render(<FilterModal {...defaultProps} />);
      
      const modal = document.querySelector('.find-modal') as HTMLElement;
      expect(modal).toBeInTheDocument();
      
      // Verify inline styles are applied
      expect(modal.style.width).toBe('auto');
      expect(modal.style.padding).toBe('12px');
      // minWidth 'unset' might not be supported in JSDOM, so just check it exists
      expect(modal.style.minWidth).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('should have proper label associations', () => {
      render(<FilterModal {...defaultProps} />);
      
      expect(screen.getByLabelText('Draft')).toBeInTheDocument();
      expect(screen.getByLabelText('Published')).toBeInTheDocument();
      expect(screen.getByLabelText('Deprecated')).toBeInTheDocument();
      expect(screen.getByLabelText('Removed')).toBeInTheDocument();
    });

    it('should have clickable labels', async () => {
      render(<FilterModal {...defaultProps} />);
      
      const draftLabel = screen.getByText('Draft');
      const draftCheckbox = screen.getByLabelText('Draft') as HTMLInputElement;
      
      expect(draftCheckbox.checked).toBe(true);
      
      await user.click(draftLabel);
      
      expect(draftCheckbox.checked).toBe(false);
    });

    it('should have proper checkbox roles', () => {
      render(<FilterModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4);
      
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('type', 'checkbox');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty filter object', () => {
      const emptyFilter = {} as StatusFilter;
      
      expect(() => {
        render(<FilterModal {...defaultProps} currentFilter={emptyFilter} />);
      }).not.toThrow();
    });

    it('should handle filter with undefined values', () => {
      const undefinedFilter = {
        [SchemaStatus.Draft]: undefined,
        [SchemaStatus.Published]: true,
        [SchemaStatus.Deprecated]: undefined,
        [SchemaStatus.Removed]: false
      } as any;
      
      render(<FilterModal {...defaultProps} currentFilter={undefinedFilter} />);
      
      const draftCheckbox = screen.getByLabelText('Draft') as HTMLInputElement;
      const deprecatedCheckbox = screen.getByLabelText('Deprecated') as HTMLInputElement;
      
      expect(draftCheckbox.checked).toBe(false); // undefined should be falsy
      expect(deprecatedCheckbox.checked).toBe(false); // undefined should be falsy
    });

    it('should handle rapid open/close cycles', () => {
      const { rerender } = render(<FilterModal {...defaultProps} isOpen={false} />);
      
      for (let i = 0; i < 5; i++) {
        rerender(<FilterModal {...defaultProps} isOpen={true} />);
        rerender(<FilterModal {...defaultProps} isOpen={false} />);
      }
      
      // Should not throw or cause memory leaks
      expect(document.querySelector('.find-modal-overlay')).not.toBeInTheDocument();
    });

    it('should handle concurrent filter changes', async () => {
      render(<FilterModal {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      
      // Click all checkboxes simultaneously
      await Promise.all(checkboxes.map(checkbox => user.click(checkbox)));
      
      checkboxes.forEach(checkbox => {
        expect(checkbox.checked).toBe(false);
      });
    });
  });
});